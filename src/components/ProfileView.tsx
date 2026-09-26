"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  User, Shield, Database, HardDrive, Trash2, Check, 
  RefreshCw, Fingerprint, Lock, Unlock, Eye, EyeOff, 
  Key, X, Camera, ArrowRight, ShieldCheck, Download, Upload
} from "lucide-react";
import { motion } from "framer-motion";

export interface UserProfile {
  name: string;
  email: string;
  accent: "cyan" | "purple" | "teal" | "green" | "gold";
  masterKey: string;
}

const getCleanProfilePicture = (url?: string) => {
  if (!url) return "";
  if (url.includes("dicebear.com/7.x/bottts") && !url.includes("scale=")) {
    return url.includes("?") ? `${url}&scale=85` : `${url}?scale=85`;
  }
  return url;
};

interface ProfileViewProps {
  currentUser: { 
    username: string; 
    email: string; 
    displayName: string; 
    profilePicture: string; 
    googleId?: string;
    hasPassword?: boolean;
  } | null;
  memoriesCount: number;
  lettersCount: number;
  onClearAllData: () => void;
  onLockWeb: () => void;
  onClose: () => void;
  onUpdateUser: (updatedUser: any) => void;
}

export default function ProfileView({
  currentUser,
  memoriesCount,
  lettersCount,
  onClearAllData,
  onLockWeb,
  onClose,
  onUpdateUser
}: ProfileViewProps) {
  const [profileAccent, setProfileAccent] = useState<"cyan" | "purple" | "teal" | "green" | "gold">("cyan");
  const [storageSize, setStorageSize] = useState("0 KB");

  // Edit fields
  const [newDisplayName, setNewDisplayName] = useState(currentUser?.displayName || currentUser?.username || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isNameSaved, setIsNameSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Web Lock Settings States
  const [lockPasscode, setLockPasscode] = useState("");
  const [isLockConfigured, setIsLockConfigured] = useState(false);
  const [isLockDisabled, setIsLockDisabled] = useState(false);
  const [useFingerprintForLock, setUseFingerprintForLock] = useState(false);
  const [lockStatusMsg, setLockStatusMsg] = useState("");

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Account Password Change States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load configuration and calculate footprint on mount
  useEffect(() => {
    if (typeof window !== "undefined" && currentUser) {
      // Check biometric support
      if (window.PublicKeyCredential) {
        setIsBiometricSupported(true);
        fetch("/api/auth/login/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: currentUser.username })
        })
        .then(res => {
          if (res.status === 200) {
            setIsEnrolled(true);
          } else {
            const hasLocalCred = localStorage.getItem(`memento_lock_credential_id_${currentUser.username}`);
            setIsEnrolled(!!hasLocalCred);
          }
        })
        .catch(err => {
          console.error("Error checking biometric keys:", err);
          const hasLocalCred = localStorage.getItem(`memento_lock_credential_id_${currentUser.username}`);
          setIsEnrolled(!!hasLocalCred);
        });
      }

      // Load Web Lock config for current user
      const savedPasscode = localStorage.getItem(`memento_lock_password_${currentUser.username}`);
      const savedFingerprint = localStorage.getItem(`memento_lock_use_fingerprint_${currentUser.username}`) === "true";
      const savedDisabled = localStorage.getItem(`memento_lock_disabled_${currentUser.username}`) === "true";
      
      setIsLockConfigured(!!savedPasscode);
      setUseFingerprintForLock(savedFingerprint);
      setIsLockDisabled(savedDisabled);

      // Load theme accent
      const cachedProfile = localStorage.getItem("memento_profile");
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          if (parsed.accent) setProfileAccent(parsed.accent);
        } catch (e) {}
      }

      calculateStorageSize();
    }
  }, [currentUser]);

  // Self-healing: if biometric lock is enabled in settings but no credential exists, disable it
  useEffect(() => {
    if (currentUser) {
      const savedFingerprint = localStorage.getItem(`memento_lock_use_fingerprint_${currentUser.username}`) === "true";
      const hasLocalCred = !!localStorage.getItem(`memento_lock_credential_id_${currentUser.username}`);
      
      if (savedFingerprint && !isEnrolled && !hasLocalCred) {
        setUseFingerprintForLock(false);
        localStorage.setItem(`memento_lock_use_fingerprint_${currentUser.username}`, "false");
      }
    }
  }, [isEnrolled, currentUser]);

  // Helper: buffer transformations
  const bufferToBase64URL = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let string = "";
    for (const byte of bytes) {
      string += String.fromCharCode(byte);
    }
    return btoa(string)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  const base64URLToBuffer = (base64url: string): ArrayBuffer => {
    let b64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const string = atob(b64);
    const bytes = new Uint8Array(string.length);
    for (let i = 0; i < string.length; i++) {
      bytes[i] = string.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const getFriendlyErrorMessage = (error: any): string => {
    const msg = error.message || String(error);
    if (msg.includes("NotAllowedError") || msg.toLowerCase().includes("cancelled") || msg.toLowerCase().includes("not allowed")) {
      return "Biometric authentication cancelled or denied by user.";
    }
    if (msg.includes("TimeoutError") || msg.toLowerCase().includes("timed out")) {
      return "Biometric scan timed out. Please try again.";
    }
    if (msg.includes("InvalidStateError") || msg.toLowerCase().includes("already registered")) {
      return "This biometric device is already registered for this user.";
    }
    return msg;
  };

  // Register WebAuthn Credential
  const handleRegisterFingerprint = async () => {
    if (!currentUser) return;
    if (!isLockConfigured) {
      alert("Please set a Web Lock passcode (PIN) first before linking a biometric key.");
      return;
    }
    setIsEnrolling(true);
    try {
      const username = currentUser.username;
      
      const res = await fetch("/api/auth/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const options = await res.json();
      if (options.error) throw new Error(options.error);

      options.challenge = base64URLToBuffer(options.challenge);
      options.user.id = base64URLToBuffer(options.user.id);
      if (options.excludeCredentials) {
        options.excludeCredentials.forEach((c: any) => c.id = base64URLToBuffer(c.id));
      }

      const credential = (await navigator.credentials.create({
        publicKey: options
      })) as PublicKeyCredential;

      if (!credential) throw new Error("Verification scan returned null.");

      const publicKeyDer = (credential.response as any).getPublicKey();

      const payload = {
        username,
        credential: {
          id: credential.id,
          publicKey: bufferToBase64URL(publicKeyDer)
        }
      };

      let serverVerified = false;
      try {
        const verifyRes = await fetch("/api/auth/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          serverVerified = true;
        }
      } catch (err) {
        console.warn("Server validation failed/offline, fallback to local storage:", err);
      }
      const cleanU = username.toLowerCase().trim();
      localStorage.setItem(`memento_lock_credential_id_${username}`, credential.id);
      localStorage.setItem(`memento_lock_credential_id_${cleanU}`, credential.id);
      localStorage.setItem(`memento_lock_use_fingerprint_${username}`, "true");
      localStorage.setItem(`memento_lock_use_fingerprint_${cleanU}`, "true");
      setUseFingerprintForLock(true);
      setIsEnrolled(true);
      alert("Fingerprint registered successfully! Biometric lock is now active.");
    } catch (e: any) {
      console.error("Enrollment failed:", e);
      alert(getFriendlyErrorMessage(e));
    } finally {
      setIsEnrolling(false);
    }
  };

  // Change Profile Picture (Base64 file upload)
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("Profile picture size must be smaller than 1MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const res = await fetch("/api/auth/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: currentUser?.username,
            profilePicture: base64String
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          onUpdateUser(data.user);
          alert("Profile picture updated successfully!");
        } else {
          throw new Error(data.error || "Failed to save profile picture");
        }
      } catch (err: any) {
        alert(err.message || "Failed to upload avatar.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Display Name to DB
  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    setIsSavingName(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser?.username,
          displayName: newDisplayName.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdateUser(data.user);
        setIsNameSaved(true);
        setTimeout(() => setIsNameSaved(false), 2000);
      } else {
        throw new Error(data.error || "Failed to update display name.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to update name.");
    } finally {
      setIsSavingName(false);
    }
  };

  const hashString = async (str: string): Promise<string> => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg("");

    if (!currentUser) return;

    if (newPassword.length < 4) {
      setPasswordStatusMsg("New password must be at least 4 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatusMsg("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          currentPassword: oldPassword,
          password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password update failed.");

      // Sync local users file fallback
      const raw = localStorage.getItem("memento_local_users");
      if (raw) {
        try {
          const localUsers = JSON.parse(raw);
          const idx = localUsers.findIndex((u: any) => u.username === currentUser.username);
          if (idx !== -1) {
            localUsers[idx].passwordHash = await hashString(newPassword);
            localStorage.setItem("memento_local_users", JSON.stringify(localUsers));
          }
        } catch (e) {}
      }

      // Update current session hasPassword property
      onUpdateUser({
        ...currentUser,
        hasPassword: true
      });

      setPasswordStatusMsg("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordStatusMsg(""), 3000);
    } catch (err: any) {
      // Offline fallback handling: verify current password locally
      if (err.message && (err.message.includes("fetch") || err.message.includes("NetworkError") || err.message.includes("Failed to fetch"))) {
        const raw = localStorage.getItem("memento_local_users");
        if (raw) {
          try {
            const localUsers = JSON.parse(raw);
            const idx = localUsers.findIndex((u: any) => u.username === currentUser.username);
            if (idx !== -1) {
              if (localUsers[idx].passwordHash) {
                const hashedOld = await hashString(oldPassword);
                if (localUsers[idx].passwordHash !== hashedOld) {
                  setPasswordStatusMsg("Current password is incorrect.");
                  return;
                }
              }
              localUsers[idx].passwordHash = await hashString(newPassword);
              localStorage.setItem("memento_local_users", JSON.stringify(localUsers));
              
              onUpdateUser({
                ...currentUser,
                hasPassword: true
              });
              setPasswordStatusMsg("Password updated successfully (Local Sandbox).");
              setOldPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setTimeout(() => setPasswordStatusMsg(""), 3000);
              return;
            }
          } catch (e) {}
        }
      }
      setPasswordStatusMsg(err.message || "Failed to update password.");
    }
  };

  // Web Lock setup
  const handleSetupWebLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockStatusMsg("");
    if (!currentUser) return;

    if (!lockPasscode || lockPasscode.length < 4) {
      setLockStatusMsg("Passcode must be at least 4 characters long.");
      return;
    }

    const hashed = await hashString(lockPasscode);
    const cleanU = currentUser.username.toLowerCase().trim();
    localStorage.setItem(`memento_lock_password_${currentUser.username}`, hashed);
    localStorage.setItem(`memento_lock_password_${cleanU}`, hashed);
    localStorage.removeItem(`memento_lock_disabled_${currentUser.username}`);
    localStorage.removeItem(`memento_lock_disabled_${cleanU}`);
    setIsLockConfigured(true);
    setIsLockDisabled(false);
    setLockPasscode("");
    setLockStatusMsg("Web Lock Passcode configured successfully!");
    setTimeout(() => setLockStatusMsg(""), 3000);

    // Sync web lock passcode hash to database profile
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          webLockPasscodeHash: hashed
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          onUpdateUser(data.user);
        }
      }
    } catch (err) {
      console.warn("Failed to sync passcode hash to server:", err);
    }
  };

  const handleToggleFingerprintLock = () => {
    if (!currentUser) return;
    if (!isLockConfigured) {
      alert("Please set a Web Lock passcode (PIN) first before enabling biometric lock.");
      return;
    }
    const newVal = !useFingerprintForLock;
    
    const hasLocalCred = !!localStorage.getItem(`memento_lock_credential_id_${currentUser.username}`);
    if (newVal && !isEnrolled && !hasLocalCred) {
      alert("Please link your device fingerprint first using the biometric link setting below.");
      return;
    }

    setUseFingerprintForLock(newVal);
    localStorage.setItem(`memento_lock_use_fingerprint_${currentUser.username}`, newVal ? "true" : "false");
    setLockStatusMsg(newVal ? "Biometric Fingerprint unlock enabled." : "Biometric Fingerprint unlock disabled.");
    setTimeout(() => setLockStatusMsg(""), 3000);
  };

  const handleRemoveWebLock = async () => {
    if (!currentUser) return;
    if (confirm("Disable Web Lock? Anyone using this browser session can view your private archive.")) {
      localStorage.removeItem(`memento_lock_password_${currentUser.username}`);
      localStorage.removeItem(`memento_lock_use_fingerprint_${currentUser.username}`);
      localStorage.setItem(`memento_lock_disabled_${currentUser.username}`, "true");
      setIsLockConfigured(false);
      setIsLockDisabled(true);
      setUseFingerprintForLock(false);
      setLockStatusMsg("Web Lock removed.");
      setTimeout(() => setLockStatusMsg(""), 3000);

      // Clear web lock passcode hash from database profile
      try {
        const res = await fetch("/api/auth/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: currentUser.username,
            webLockPasscodeHash: ""
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            onUpdateUser(data.user);
          }
        }
      } catch (err) {
        console.warn("Failed to clear passcode hash from server:", err);
      }
    }
  };

  const handleEnableWebLock = () => {
    if (!currentUser) return;
    localStorage.removeItem(`memento_lock_disabled_${currentUser.username}`);
    setIsLockDisabled(false);
    setLockStatusMsg("Web Lock enabled.");
    setTimeout(() => setLockStatusMsg(""), 3000);
  };

  // Accent theme selectors
  const handleAccentChange = (col: "cyan" | "purple" | "teal" | "green" | "gold") => {
    setProfileAccent(col);
    
    // Save to local storage profile settings
    const cachedProfile = localStorage.getItem("memento_profile") || "{}";
    try {
      const parsed = JSON.parse(cachedProfile);
      parsed.accent = col;
      localStorage.setItem("memento_profile", JSON.stringify(parsed));
    } catch (e) {}

    // Apply color globally
    document.documentElement.style.setProperty(
      "--color-cyber-cyan",
      col === "cyan" ? "#06b6d4" :
      col === "purple" ? "#d946ef" :
      col === "teal" ? "#14b8a6" :
      col === "green" ? "#22c55e" : "#f59e0b"
    );
  };

  const calculateStorageSize = () => {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("memento_")) {
        const val = localStorage.getItem(key) || "";
        totalBytes += (key.length + val.length) * 2;
      }
    }
    setStorageSize((totalBytes / 1024).toFixed(2) + " KB");
  };

  // Backups
  const handleExportBackup = () => {
    if (!currentUser) return;
    const data = {
      profile: localStorage.getItem("memento_profile") ? JSON.parse(localStorage.getItem("memento_profile")!) : null,
      memories: localStorage.getItem(`memento_memories_${currentUser.username}`) ? JSON.parse(localStorage.getItem(`memento_memories_${currentUser.username}`)!) : [],
      letters: localStorage.getItem(`memento_letters_${currentUser.username}`) ? JSON.parse(localStorage.getItem(`memento_letters_${currentUser.username}`)!) : []
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `memento_backup_${currentUser.username}_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.memories || data.letters || data.profile) {
          if (data.profile) localStorage.setItem("memento_profile", JSON.stringify(data.profile));
          if (data.memories) localStorage.setItem(`memento_memories_${currentUser.username}`, JSON.stringify(data.memories));
          if (data.letters) localStorage.setItem(`memento_letters_${currentUser.username}`, JSON.stringify(data.letters));
          
          alert("Backup successfully imported and restored!");
          window.location.reload();
        } else {
          alert("Invalid backup file structure.");
        }
      } catch (err) {
        alert("Failed to parse the backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    if (confirm("Permanently wipe local data? This action cannot be undone.")) {
      await onClearAllData();
      calculateStorageSize();
      alert("All local data wiped.");
      window.location.reload();
    }
  };

  const logoutSession = () => {
    if (currentUser) {
      localStorage.removeItem(`memento_is_locked_${currentUser.username}`);
    }
    localStorage.removeItem("memento_session");
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Drawer Container */}
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative z-10 w-full max-w-md h-full bg-[#02050f] border-l border-cyber-cyan/15 flex flex-col shadow-2xl"
      >
        {/* CRT scanline overlay inside drawer */}
        <div className="scanlines-overlay pointer-events-none"></div>

        {/* Drawer Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-cyber-cyan/15 bg-cyber-card/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyber-cyan animate-pulse" />
            <h2 className="font-display text-sm font-extrabold text-white tracking-widest uppercase">
              Profile & Security
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 border border-cyber-cyan/20 text-gray-400 hover:text-cyber-cyan rounded-lg hover:bg-cyber-cyan/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin select-none">

          {/* User Circular Avatar Card */}
          <div className="glass-panel border-cyber-cyan/15 rounded-xl p-5 flex flex-col items-center text-center gap-3 relative overflow-hidden bg-cyber-bg/50">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-cyber-cyan/50 p-1 flex items-center justify-center relative overflow-hidden group shadow-lg shadow-cyber-cyan/5 bg-cyber-bg">
                {currentUser?.profilePicture ? (
                  <img
                    src={getCleanProfilePicture(currentUser.profilePicture)}
                    alt="User profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyber-cyan/20 to-cyber-purple/20 flex items-center justify-center text-cyber-cyan text-xl font-bold font-mono uppercase">
                    {currentUser?.displayName ? currentUser.displayName.slice(0, 2) : currentUser?.username.slice(0, 2)}
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-cyber-cyan animate-spin" />
                  </div>
                )}
              </div>
              <button 
                onClick={triggerFileInput}
                disabled={isUploading}
                className="absolute bottom-0 right-0 p-2 bg-cyber-cyan border border-cyber-cyan/30 text-black hover:bg-white hover:text-black rounded-full transition-all cursor-pointer shadow-md"
                title="Upload Profile Picture"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            
            <div className="flex flex-col gap-1 w-full">
              {/* Display name form */}
              <form onSubmit={handleSaveDisplayName} className="flex gap-2 w-full max-w-xs mx-auto justify-center mt-1">
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Set Display Name..."
                  className="bg-cyber-bg/90 border border-cyber-cyan/15 rounded-lg px-3 py-1.5 text-xs text-center text-gray-200 focus:outline-none focus:border-cyber-cyan font-semibold flex-1"
                />
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan text-cyber-cyan px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                >
                  {isSavingName ? "Saving" : isNameSaved ? "Saved" : "Save"}
                </button>
              </form>
              <span className="font-mono text-[10px] text-gray-500 mt-1 uppercase">@{currentUser?.username} • {currentUser?.email}</span>
            </div>

            {/* Sync connection details */}
            <div className="w-full mt-2 pt-3 border-t border-cyber-cyan/10 flex justify-between items-center text-[10px] font-mono">
              <span className="text-gray-500 uppercase">Gateway status</span>
              {currentUser?.googleId ? (
                <span className="text-cyber-purple font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-cyber-purple" />
                  Google SSO Linked
                </span>
              ) : (
                <span className="text-cyber-cyan font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-cyber-cyan" />
                  Password Auth Secured
                </span>
              )}
            </div>
          </div>

          {/* Theme Accent Settings */}
          <div className="glass-panel border-cyber-cyan/10 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="font-mono text-xs text-white uppercase tracking-wider font-bold">
              Theme Accent Matrix
            </h3>
            <div className="flex gap-2.5 py-1">
              {(["cyan", "purple", "teal", "green", "gold"] as const).map((col) => (
                <button
                  key={col}
                  onClick={() => handleAccentChange(col)}
                  className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                    col === "cyan" ? "bg-cyan-500 border-cyan-300" :
                    col === "purple" ? "bg-fuchsia-500 border-fuchsia-300" :
                    col === "teal" ? "bg-teal-500 border-teal-300" :
                    col === "green" ? "bg-green-500 border-green-300" : "bg-amber-500 border-amber-300"
                  } ${profileAccent === col ? "scale-110 ring-2 ring-white/50" : "opacity-60 hover:opacity-100 cursor-pointer"}`}
                >
                  {profileAccent === col && <Check className="w-3.5 h-3.5 text-white font-bold" />}
                </button>
              ))}
            </div>
          </div>

          {/* Change Account Password Section */}
          {(!currentUser?.googleId || currentUser?.hasPassword) && (
            <div className="glass-panel border-cyber-cyan/10 rounded-xl p-4 flex flex-col gap-3">
              <button
                onClick={() => setShowChangePassword(!showChangePassword)}
                className="font-mono text-xs text-white uppercase tracking-wider font-bold w-full text-left flex justify-between items-center cursor-pointer"
              >
                <span>Change Account Password</span>
                <span className="text-[10px] text-cyber-cyan">{showChangePassword ? "[- CLOSE]" : "[+ OPEN]"}</span>
              </button>

              {showChangePassword && (
                <form onSubmit={handleChangePassword} className="flex flex-col gap-3 mt-2 animate-fade-in">
                  {passwordStatusMsg && (
                    <div className={`p-2.5 rounded-lg text-[10px] font-mono border ${
                      passwordStatusMsg.includes("successfully") 
                        ? "bg-cyber-green/10 border-cyber-green/35 text-cyber-green" 
                        : "bg-red-500/10 border-red-500/35 text-red-400"
                    }`}>
                      {passwordStatusMsg}
                    </div>
                  )}
                  {currentUser?.hasPassword && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Current Password</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter current password..."
                        className="bg-cyber-bg border border-cyber-cyan/15 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters..."
                      className="bg-cyber-bg border border-cyber-cyan/15 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password..."
                      className="bg-cyber-bg border border-cyber-cyan/15 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-cyber-cyan/15 border border-cyber-cyan text-cyber-cyan py-2 rounded-lg text-xs font-mono font-bold uppercase hover:bg-cyber-cyan/25 transition-all cursor-pointer"
                  >
                    Update Password
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Web Lock Configuration */}
          <div className="glass-panel border-cyber-cyan/10 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="font-mono text-xs text-white uppercase tracking-wider font-bold">
              Private Screen Web Lock
            </h3>
            
            <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
              Lock your dashboard session behind a security overlay. Requires PIN passcode or local fingerprint verification to restore view.
            </p>

            {lockStatusMsg && (
              <div className="bg-cyber-cyan/10 border border-cyber-cyan/25 text-cyber-cyan p-2.5 rounded-lg text-[9px] font-mono">
                {lockStatusMsg}
              </div>
            )}

            {isLockDisabled ? (
              <button
                onClick={handleEnableWebLock}
                className="w-full bg-cyber-cyan/10 border border-cyber-cyan/25 text-cyber-cyan py-2 rounded-lg text-xs font-mono font-bold uppercase hover:bg-cyber-cyan/20 transition-all cursor-pointer"
              >
                Enable Screen Lock
              </button>
            ) : (
              <div className="flex flex-col gap-3 font-mono text-xs">
                
                {/* Fingerprint Toggle */}
                <div className="flex justify-between items-center py-1 border-b border-cyber-cyan/5">
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-[11px] text-gray-300">Biometric fingerprint lock</span>
                    <span className="text-[9px] text-gray-500 font-sans">Unlock session via fingerprint scanner</span>
                  </div>
                  <button
                    onClick={handleToggleFingerprintLock}
                    className={`px-2.5 py-1.5 border text-[9px] font-bold rounded-lg cursor-pointer transition-all ${
                      useFingerprintForLock
                        ? "bg-cyber-green/15 border-cyber-green text-cyber-green"
                        : "bg-cyber-cyan/5 border-cyber-cyan/20 text-cyber-cyan"
                    }`}
                  >
                    {useFingerprintForLock ? "ENABLED" : "DISABLED"}
                  </button>
                </div>

                {/* Fingerprint linking status */}
                {isBiometricSupported && (
                  <div className="flex justify-between items-center py-1">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[11px] text-gray-300">Biometric scanner key</span>
                      <span className="text-[9px] text-cyber-cyan">{isEnrolled ? "KEY REGISTRATION SECURED" : "DEVICE NOT LINKED"}</span>
                    </div>
                    <button
                      onClick={handleRegisterFingerprint}
                      disabled={isEnrolling}
                      className="px-2.5 py-1.5 bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan text-[9px] font-bold rounded-lg hover:bg-cyber-cyan/20 cursor-pointer"
                    >
                      {isEnrolling ? "SCANNING..." : isEnrolled ? "RE-LINK KEY" : "LINK KEY"}
                    </button>
                  </div>
                )}

                {/* PIN Lock Config */}
                {!isLockConfigured ? (
                  <form onSubmit={handleSetupWebLock} className="flex gap-2 pt-2 border-t border-cyber-cyan/5">
                    <input
                      type="password"
                      required
                      value={lockPasscode}
                      onChange={(e) => setLockPasscode(e.target.value)}
                      placeholder="Set lock PIN PIN..."
                      className="bg-cyber-bg border border-cyber-cyan/15 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono flex-1"
                    />
                    <button
                      type="submit"
                      className="bg-cyber-cyan/15 border border-cyber-cyan text-cyber-cyan px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                    >
                      Set PIN
                    </button>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-cyber-cyan/5">
                    <button
                      onClick={onLockWeb}
                      className="bg-cyber-cyan/15 border border-cyber-cyan text-cyber-cyan py-2 rounded-lg text-xs font-mono font-bold uppercase hover:bg-cyber-cyan/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Lock Now
                    </button>
                    <button
                      onClick={handleRemoveWebLock}
                      className="bg-red-950/10 border border-red-500/20 text-red-400 py-2 rounded-lg text-xs font-mono font-bold uppercase hover:bg-red-950/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Lock
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Diagnostics and Footprint */}
          <div className="glass-panel border-cyber-cyan/10 rounded-xl p-4 flex flex-col gap-3 font-mono text-xs">
            <h3 className="text-white uppercase tracking-wider font-bold">
              Database Diagnostics
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center bg-cyber-bg/30 border border-cyber-cyan/5 rounded-lg p-2.5">
                <span className="text-gray-500 uppercase text-[10px]">Data footprints</span>
                <span className="font-bold text-cyber-cyan">{storageSize}</span>
              </div>
              <div className="flex justify-between items-center bg-cyber-bg/30 border border-cyber-cyan/5 rounded-lg p-2.5">
                <span className="text-gray-500 uppercase text-[10px]">Memories Nodes</span>
                <span className="font-bold text-cyber-cyan">{memoriesCount}</span>
              </div>
              <div className="flex justify-between items-center bg-cyber-bg/30 border border-cyber-cyan/5 rounded-lg p-2.5">
                <span className="text-gray-500 uppercase text-[10px]">Capsule Letters</span>
                <span className="font-bold text-cyber-purple">{lettersCount}</span>
              </div>
            </div>

            {/* Backups */}
            <div className="mt-2 flex flex-col gap-2">
              <span className="text-gray-500 uppercase text-[9px] font-bold">JSON backup actions</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={handleExportBackup}
                  className="bg-cyber-cyan/10 border border-cyber-cyan/20 hover:border-cyber-cyan text-cyber-cyan py-2 rounded-lg font-sans font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </button>
                <label className="bg-cyber-purple/10 border border-cyber-purple/20 hover:border-cyber-purple text-cyber-purple py-2 rounded-lg font-sans font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Import JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Sandbox wipe */}
          <div className="grid grid-cols-2 gap-2.5 mt-2">
            <button
              onClick={logoutSession}
              className="font-mono text-[10px] font-bold border border-cyber-cyan/30 hover:border-cyber-cyan bg-cyber-bg/40 hover:bg-cyber-cyan/10 text-cyber-cyan py-3 rounded-lg transition-all uppercase tracking-wider cursor-pointer text-center"
            >
              LOG OUT SESSION
            </button>
            <button
              onClick={handleClearData}
              className="font-mono text-[10px] font-bold border border-red-500/35 hover:border-red-500 bg-red-950/5 hover:bg-red-950/20 text-red-400 py-3 rounded-lg transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              RESET SANDBOX
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
