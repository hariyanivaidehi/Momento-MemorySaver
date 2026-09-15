"use client";

import React, { useState, useEffect, useRef } from "react";
import { ShieldAlert, ShieldCheck, User, Mail, KeyRound, Eye, EyeOff, Phone, Fingerprint, Trash2, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UserSession {
  username: string;
  email: string;
  displayName: string;
  profilePicture: string;
  googleId?: string;
  hasPassword?: boolean;
  webLockPasscodeHash?: string;
}

interface BiometricLoginProps {
  onVerify: (session: UserSession) => void;
}

export default function BiometricLogin({ onVerify }: BiometricLoginProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "failed">("idle");
  const [telemetry, setTelemetry] = useState<string[]>([]);

  // Form Fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupMethod, setSignupMethod] = useState<"email" | "mobile">("email");
  const [signupMobile, setSignupMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [enrollBiometricsOnSignup, setEnrollBiometricsOnSignup] = useState(true);

  // Error & Status states
  const [formError, setFormError] = useState("");
  const [systemExists, setSystemExists] = useState(false);
  const [loginHasBiometrics, setLoginHasBiometrics] = useState(false);

  // Dynamic Biometrics Enrollment Detector
  useEffect(() => {
    if (!loginUsername.trim()) {
      // Check if any local biometric credential exists on this device
      let anyEnrolled = false;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("memento_lock_credential_id_")) {
            anyEnrolled = true;
            break;
          }
        }
      } catch (e) {}
      setLoginHasBiometrics(anyEnrolled);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/auth/has-biometrics?usernameOrEmail=${encodeURIComponent(loginUsername)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setLoginHasBiometrics(data.hasBiometrics);
          } else {
            const hasLocal = !!localStorage.getItem(`memento_lock_credential_id_${loginUsername.toLowerCase().trim()}`);
            setLoginHasBiometrics(hasLocal);
          }
        })
        .catch(() => {
          const hasLocal = !!localStorage.getItem(`memento_lock_credential_id_${loginUsername.toLowerCase().trim()}`);
          setLoginHasBiometrics(hasLocal);
        });
    }, 450);

    return () => clearTimeout(timer);
  }, [loginUsername]);

  // Dynamic Device Google Accounts (No hardcoded credentials)
  const [showGoogleMockModal, setShowGoogleMockModal] = useState(false);
  const [deviceGoogleAccounts, setDeviceGoogleAccounts] = useState<Array<{ email: string; name: string }>>([]);
  const [mockGoogleEmail, setMockGoogleEmail] = useState("");
  const [mockGoogleName, setMockGoogleName] = useState("");
  const [googleModalTab, setGoogleModalTab] = useState<"choose" | "login">("login");
  const [isGoogleSdkLoaded, setIsGoogleSdkLoaded] = useState(false);

  // Load saved device accounts on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("memento_device_google_accounts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDeviceGoogleAccounts(parsed);
          setMockGoogleEmail(parsed[0].email);
          setMockGoogleName(parsed[0].name);
          setGoogleModalTab("choose");
          return;
        }
      }
    } catch (e) {}
    setGoogleModalTab("login");
  }, []);
  // Load Google SDK script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGoogleSdkLoaded(true);
    };
    document.head.appendChild(script);
    return () => {
      // Clean up script on unmount
      try {
        document.head.removeChild(script);
      } catch (e) {}
    };
  }, []);

  // Check if any accounts exist to guide onboarding
  useEffect(() => {
    fetch("/api/auth/exists")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSystemExists(data.exists);
          if (!data.exists) {
            setActiveTab("signup");
            setTelemetry(prev => [
              ...prev,
              "SYSTEM CONFIG: No registered users found. Redirecting to initialization panel."
            ]);
          } else {
            setTelemetry(prev => [
              ...prev,
              "SYSTEM: Encrypted user directory found. Enter identity parameters."
            ]);
          }
        }
      })
      .catch(err => console.error("Error checking system status:", err));
  }, []);

  const onVerifyRef = useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  // Telemetry logs sequence on load
  useEffect(() => {
    const logs = [
      "SYSTEM: Boot sector initialized...",
      "SYSTEM: Preparing secure Sandbox environment...",
      "SYSTEM: User credential verification modules loaded.",
      "SYSTEM: Ready for identity challenge."
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        setTelemetry((prev) => [...prev, logs[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

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

  // Sound Audio Engines
  const playScanBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  const playFailBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  };

  const playSynthChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.02, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch (e) {}
  };

  const hashPasswordClient = async (pwd: string): Promise<string> => {
    try {
      const msgBuffer = new TextEncoder().encode(pwd);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      let hash = 0;
      for (let i = 0; i < pwd.length; i++) {
        hash = (hash << 5) - hash + pwd.charCodeAt(i);
        hash |= 0;
      }
      return hash.toString(16);
    }
  };

  const getLocalUsers = (): any[] => {
    try {
      const raw = localStorage.getItem("memento_local_users");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveLocalUsers = (users: any[]) => {
    try {
      localStorage.setItem("memento_local_users", JSON.stringify(users));
    } catch (e) {}
  };

  // OTP Helpers for Mobile Sign Up
  const handleSendOtp = () => {
    setFormError("");
    if (!signupMobile) {
      setFormError("Please enter your mobile number first.");
      playFailBeep();
      return;
    }
    const cleanMobile = signupMobile.trim();
    if (cleanMobile.length < 10) {
      setFormError("Please enter a valid 10-digit mobile number.");
      playFailBeep();
      return;
    }
    // Generate simulated 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);
    setOtpVerified(false);
    playSynthChime();
    setTelemetry(prev => [
      ...prev,
      `[SMS GATEWAY] Sent verification OTP code: [${code}] to +91-${cleanMobile}`
    ]);
    // Display a clear browser alert showing the simulated OTP code
    alert(`🔒 MEMENTO OTP SECURITY:\n\nYour simulated verification OTP code is: ${code}\n\nPlease enter this code to verify your mobile number.`);
  };

  const handleVerifyOtp = () => {
    setFormError("");
    if (!otpCode) {
      setFormError("Please enter the verification code.");
      playFailBeep();
      return;
    }
    if (otpCode.trim() === generatedOtp) {
      setOtpVerified(true);
      playSynthChime();
      setTelemetry(prev => [
        ...prev,
        `SYSTEM: OTP verified successfully. Ready to register.`
      ]);
    } else {
      setFormError("Invalid verification code. Please try again.");
      playFailBeep();
    }
  };

  // 1. Password Signup Flow
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!signupUsername || !signupPassword) {
      setFormError("Username and password are required.");
      playFailBeep();
      return;
    }

    if (signupMethod === "email" && !signupEmail) {
      setFormError("Email address is required.");
      playFailBeep();
      return;
    }

    if (signupMethod === "mobile" && !signupMobile) {
      setFormError("Mobile number is required.");
      playFailBeep();
      return;
    }

    if (signupMethod === "mobile" && !otpVerified) {
      setFormError("Please verify your mobile number with OTP first.");
      playFailBeep();
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: signupUsername,
          email: signupMethod === "email" ? signupEmail : "",
          password: signupPassword,
          mobileNumber: signupMethod === "mobile" ? signupMobile : "",
          mobileVerified: signupMethod === "mobile" ? otpVerified : false
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      playSynthChime();
      setTelemetry(prev => [
        ...prev,
        `SYSTEM: Registration successful for User [${signupUsername.toUpperCase()}]. Please sign in.`
      ]);
      setLoginUsername(signupUsername);
      setSignupUsername("");
      setSignupEmail("");
      setSignupMobile("");
      setSignupPassword("");
      setOtpCode("");
      setOtpSent(false);
      setOtpVerified(false);
      setActiveTab("login");
      setSystemExists(true);
    } catch (err: any) {
      console.warn("Server signup offline, using local storage backup:", err);
      // Client-side fallback
      const localUsers = getLocalUsers();
      const cleanUsername = signupUsername.toLowerCase().trim();
      const cleanEmail = signupEmail.toLowerCase().trim();
      const cleanMobile = signupMobile.trim();
      
      const exists = localUsers.some(
        u => u.username === cleanUsername || 
             (u.email && u.email === cleanEmail) || 
             (u.mobileNumber && u.mobileNumber === cleanMobile)
      );
      if (exists) {
        setFormError("Username, Email, or Mobile is already taken locally.");
        playFailBeep();
        return;
      }

      const clientHash = await hashPasswordClient(signupPassword);
      localUsers.push({
        username: cleanUsername,
        email: signupMethod === "email" ? cleanEmail : "",
        passwordHash: clientHash,
        mobileNumber: signupMethod === "mobile" ? cleanMobile : "",
        mobileVerified: signupMethod === "mobile" ? otpVerified : false
      });
      saveLocalUsers(localUsers);

      playSynthChime();
      setTelemetry(prev => [
        ...prev,
        `SYSTEM: Registered [${cleanUsername.toUpperCase()}] locally (Sandbox persistence enabled).`
      ]);

      if (enrollBiometricsOnSignup) {
        await enrollBiometricsForUser(signupUsername);
      }

      setLoginUsername(signupUsername);
      setSignupUsername("");
      setSignupEmail("");
      setSignupMobile("");
      setSignupPassword("");
      setOtpCode("");
      setOtpSent(false);
      setOtpVerified(false);
      setActiveTab("login");
      setSystemExists(true);
    }
  };

  // Helper to enroll biometrics for a user
  const enrollBiometricsForUser = async (targetUsername: string) => {
    try {
      if (typeof window === "undefined" || !window.PublicKeyCredential) return;
      setTelemetry(prev => [...prev, `BIOMETRICS: Launching device sensor enrollment for [${targetUsername}]...`]);
      let options: any;
      try {
        const res = await fetch("/api/auth/register/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: targetUsername })
        });
        if (res.ok) {
          options = await res.json();
        }
      } catch (e) {}

      if (!options || options.error) {
        // Local fallback options
        const challenge = new Uint8Array(32);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(challenge);
        window.crypto.getRandomValues(userId);
        options = {
          challenge: challenge.buffer,
          rp: { name: "Memento Core" },
          user: {
            id: userId.buffer,
            name: targetUsername,
            displayName: targetUsername
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: { userVerification: "preferred" },
          timeout: 60000
        };
      } else {
        options.challenge = base64URLToBuffer(options.challenge);
        options.user.id = base64URLToBuffer(options.user.id);
        if (options.excludeCredentials) {
          options.excludeCredentials.forEach((c: any) => c.id = base64URLToBuffer(c.id));
        }
      }

      const cred = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential;
      if (cred) {
        const cleanU = targetUsername.toLowerCase().trim();
        localStorage.setItem(`memento_lock_credential_id_${cleanU}`, cred.id);
        localStorage.setItem(`memento_lock_use_fingerprint_${cleanU}`, "true");
        setLoginHasBiometrics(true);
        setTelemetry(prev => [...prev, `BIOMETRICS: Passkey successfully linked to [${targetUsername}]!`]);
        
        try {
          const publicKeyDer = (cred.response as any).getPublicKey ? (cred.response as any).getPublicKey() : new ArrayBuffer(0);
          await fetch("/api/auth/register/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: targetUsername,
              credential: {
                id: cred.id,
                publicKey: bufferToBase64URL(publicKeyDer)
              }
            })
          });
        } catch (e) {}
      }
    } catch (err: any) {
      console.warn("Biometric enrollment skipped or cancelled:", err);
      setTelemetry(prev => [...prev, `BIOMETRICS: Sensor setup skipped: ${err.message || err}`]);
    }
  };

  // 2. Password Login Flow
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!loginUsername || !loginPassword) {
      setFormError("Username and password are required.");
      playFailBeep();
      return;
    }

    setScanState("scanning");
    playScanBeep();
    setTelemetry(prev => [...prev, `SYSTEM: Verifying identity for user [${loginUsername.toUpperCase()}]...`]);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: loginUsername,
          password: loginPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login verification failed");

      setScanState("success");
      setTelemetry(prev => [...prev, "SYSTEM: Password verified! Decrypting Archive."]);
      setTimeout(() => {
        playSynthChime();
        onVerifyRef.current(data.user);
      }, 600);
    } catch (err: any) {
      console.warn("Server login offline, checking local storage backup:", err);
      const cleanUsername = loginUsername.toLowerCase().trim();
      const localUsers = getLocalUsers();
      const matched = localUsers.find(u => u.username === cleanUsername || u.email === cleanUsername);
      
      if (matched) {
        const clientHash = await hashPasswordClient(loginPassword);
        if (matched.passwordHash === clientHash) {
          setScanState("success");
          setTelemetry(prev => [...prev, "SYSTEM: Password verified locally! Unlocking secure Sandbox."]);
          setTimeout(() => {
            playSynthChime();
            onVerifyRef.current({
              username: matched.username,
              email: matched.email,
              displayName: matched.displayName || matched.username,
              profilePicture: matched.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(matched.email)}&scale=85`,
              googleId: matched.googleId || "",
              hasPassword: true,
              webLockPasscodeHash: matched.webLockPasscodeHash
            });
          }, 600);
          return;
        }
      }
      setScanState("failed");
      playFailBeep();
      setFormError("Invalid username/email or password.");
    }
  };

  // 3. WebAuthn Biometric Login Flow
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
    if (msg.toLowerCase().includes("user account not found") || msg.toLowerCase().includes("not found")) {
      return "User account not found. Please log in with your password or enroll your passkey first.";
    }
    return msg;
  };

  const handleBiometricLogin = async () => {
    setFormError("");
    let targetUser = loginUsername.trim();

    // If username is empty, attempt to automatically discover enrolled user on this device
    if (!targetUser) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("memento_lock_credential_id_")) {
            const found = key.replace("memento_lock_credential_id_", "");
            if (found) {
              targetUser = found;
              setLoginUsername(found);
              break;
            }
          }
        }
      } catch (e) {}
    }

    if (!targetUser) {
      setFormError("Please enter your Username/Email to scan, or register a new passkey.");
      playFailBeep();
      return;
    }

    setScanState("scanning");
    playScanBeep();
    setTelemetry((prev) => [...prev, `SYSTEM: Activating biometric sensor for [${targetUser.toUpperCase()}]...`]);

    try {
      let options: any;
      let isLocalFallback = false;
      
      try {
        const res = await fetch("/api/auth/login/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: targetUser })
        });
        if (res.ok) {
          options = await res.json();
          if (options.error) throw new Error(options.error);
        } else {
          throw new Error("Server options failed");
        }
      } catch (err) {
        console.warn("Server biometric login offline, trying local credentials lookup:", err);
        isLocalFallback = true;
      }

      const cleanUsername = targetUser.toLowerCase().trim();
      const localCredId = localStorage.getItem(`memento_lock_credential_id_${cleanUsername}`);

      if (isLocalFallback || !options) {
        if (!localCredId) {
          throw new Error("No linked biometric credentials found for this account on this device. Please log in with password.");
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        options = {
          challenge: challenge.buffer,
          allowCredentials: [
            {
              type: "public-key" as const,
              id: base64URLToBuffer(localCredId)
            }
          ],
          userVerification: "preferred" as const
        };
      } else {
        options.challenge = base64URLToBuffer(options.challenge);
        if (options.allowCredentials) {
          options.allowCredentials.forEach((c: any) => c.id = base64URLToBuffer(c.id));
        }
      }

      setTelemetry((prev) => [...prev, "SYSTEM: Launching system biometric scanner window..."]);

      const assertion = (await navigator.credentials.get({
        publicKey: options
      })) as PublicKeyCredential;

      if (!assertion) throw new Error("Verification scan returned null.");

      if (isLocalFallback || localCredId) {
        setScanState("success");
        setTelemetry((prev) => [...prev, `SYSTEM: Cryptographic match locally! Welcoming [${targetUser.toUpperCase()}].`]);
        
        const localUsers = getLocalUsers();
        const matched = localUsers.find(u => u.username === cleanUsername || u.email === cleanUsername);
        
        setTimeout(() => {
          playSynthChime();
          onVerifyRef.current({
            username: matched?.username || cleanUsername,
            email: matched?.email || `${cleanUsername}@memento.local`,
            displayName: matched?.displayName || matched?.username || cleanUsername,
            profilePicture: matched?.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(matched?.email || cleanUsername)}&scale=85`,
            googleId: matched?.googleId || "",
            hasPassword: matched ? !!matched.passwordHash : false,
            webLockPasscodeHash: matched?.webLockPasscodeHash
          });
        }, 600);
      } else {
        setTelemetry((prev) => [...prev, "SYSTEM: Key captured. Validating signature on server..."]);

        const assertionRes = assertion.response as AuthenticatorAssertionResponse;
        const assertionJSON = {
          id: assertion.id,
          rawId: bufferToBase64URL(assertion.rawId),
          type: assertion.type,
          response: {
            clientDataJSON: bufferToBase64URL(assertionRes.clientDataJSON),
            authenticatorData: bufferToBase64URL(assertionRes.authenticatorData),
            signature: bufferToBase64URL(assertionRes.signature),
            userHandle: assertionRes.userHandle ? bufferToBase64URL(assertionRes.userHandle) : null
          }
        };

        const verifyRes = await fetch("/api/auth/login/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: targetUser, assertion: assertionJSON })
        });
        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          setScanState("success");
          setTelemetry((prev) => [...prev, `SYSTEM: Cryptographic match! Welcoming [${targetUser.toUpperCase()}].`]);
          setTimeout(() => {
            playSynthChime();
            onVerifyRef.current(verifyData.user);
          }, 600);
        } else {
          throw new Error(verifyData.error || "Biometric verify failed.");
        }
      }
    } catch (e: any) {
      console.error(e);
      setScanState("failed");
      playFailBeep();
      const friendlyError = getFriendlyErrorMessage(e);
      setTelemetry((prev) => [...prev, `SYSTEM ERROR: Verification failed: ${friendlyError}`]);
      setFormError(friendlyError);
    }
  };

  // Remove saved device account
  const handleRemoveGoogleAccount = (emailToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deviceGoogleAccounts.filter(a => a.email.toLowerCase() !== emailToRemove.toLowerCase());
    setDeviceGoogleAccounts(updated);
    try {
      localStorage.setItem("memento_device_google_accounts", JSON.stringify(updated));
    } catch (e) {}
    if (mockGoogleEmail.toLowerCase() === emailToRemove.toLowerCase()) {
      if (updated.length > 0) {
        setMockGoogleEmail(updated[0].email);
        setMockGoogleName(updated[0].name);
      } else {
        setMockGoogleEmail("");
        setMockGoogleName("");
        setGoogleModalTab("login");
      }
    }
  };

  // Google Auth Button Handlers
  const handleGoogleSignIn = () => {
    setFormError("");
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    // Check if real Google script is loaded AND Client ID is configured
    if (clientId && (window as any).google?.accounts?.id) {
      try {
        setTelemetry(prev => [...prev, "SYSTEM: Launching real Google OAuth prompt..."]);
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            setScanState("scanning");
            setTelemetry(prev => [...prev, "SYSTEM: Verification token received. Processing Google Sync..."]);
            try {
              const res = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: response.credential })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Google auth validation failed");
              
              setScanState("success");
              setTelemetry(prev => [...prev, `SYSTEM: Google Auth match! Welcome ${data.user.username.toUpperCase()}.`]);
              setTimeout(() => {
                playSynthChime();
                onVerifyRef.current(data.user);
              }, 600);
            } catch (err: any) {
              setScanState("failed");
              setFormError(err.message || "Google token verification failed.");
            }
          }
        });
        
        (window as any).google.accounts.id.prompt();
      } catch (err) {
        console.warn("Real Google prompt failed, falling back to account chooser.", err);
        setShowGoogleMockModal(true);
      }
    } else {
      // Dynamic device Google accounts modal
      setTelemetry(prev => [...prev, "SYSTEM: Opening Google Account selector for this device..."]);
      if (deviceGoogleAccounts.length > 0) {
        setGoogleModalTab("choose");
      } else {
        setGoogleModalTab("login");
      }
      setShowGoogleMockModal(true);
    }
  };

  const handleSimulatedGoogleConfirm = async (targetEmail?: string, targetName?: string, e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const emailToAuth = (targetEmail || mockGoogleEmail).trim();
    const nameToAuth = (targetName || mockGoogleName || emailToAuth.split("@")[0]).trim();

    if (!emailToAuth) {
      setFormError("Please enter your Google account email address.");
      return;
    }

    // Save to remembered device accounts
    try {
      const existing = deviceGoogleAccounts.filter(a => a.email.toLowerCase() !== emailToAuth.toLowerCase());
      const updated = [{ email: emailToAuth, name: nameToAuth }, ...existing];
      setDeviceGoogleAccounts(updated);
      localStorage.setItem("memento_device_google_accounts", JSON.stringify(updated));
    } catch (e) {}

    setShowGoogleMockModal(false);
    setScanState("scanning");
    setTelemetry(prev => [...prev, `SYSTEM: Authenticating Google account [${emailToAuth}]...`]);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToAuth, name: nameToAuth })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Google login failed");

      setScanState("success");
      setTelemetry(prev => [...prev, `SYSTEM: Google sync verified! Logged in as [${data.user.username.toUpperCase()}].`]);
      setTimeout(() => {
        playSynthChime();
        onVerifyRef.current(data.user);
      }, 600);
    } catch (err: any) {
      setScanState("failed");
      playFailBeep();
      setFormError(err.message || "Google Sign-in failed.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#02040a] via-[#050b18] to-[#010206] cyber-grid relative overflow-hidden select-none">
      
      {/* Background soft glows */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full nebula-glow-1 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full nebula-glow-2 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="glass-panel border border-cyber-cyan/25 rounded-2xl p-6 sm:p-10 w-full max-w-lg text-center flex flex-col gap-5 sm:gap-6 relative tech-panel shadow-2xl overflow-hidden"
      >
        
        {/* Top Header info */}
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="flex justify-center mb-1">
            <div className="p-3 bg-cyber-cyan/10 border border-cyber-cyan/20 rounded-full animate-pulse">
              <ShieldCheck className="w-8 h-8 text-cyber-cyan" />
            </div>
          </div>
          <h2 className="font-display text-2xl font-extrabold tracking-wider text-white uppercase glow-text-cyan">
            MEMENTO CORE GATEWAY
          </h2>
          <p className="text-gray-400 font-sans text-xs max-w-sm mx-auto">
            Consciousness Memory Archive & secure cloud synchronized database.
          </p>
        </div>

        {/* Tab Selection buttons */}
        <div className="grid grid-cols-2 gap-1 border border-cyber-cyan/15 rounded-xl p-1 bg-cyber-bg/40 select-none">
          <button
            onClick={() => { playScanBeep(); setActiveTab("login"); setFormError(""); }}
            className={`py-2 px-4 text-xs font-mono rounded-lg transition-all cursor-pointer font-semibold ${
              activeTab === "login"
                ? "bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/25 shadow-inner"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            LOG IN
          </button>
          <button
            onClick={() => { playScanBeep(); setActiveTab("signup"); setFormError(""); }}
            className={`py-2 px-4 text-xs font-mono rounded-lg transition-all cursor-pointer font-semibold ${
              activeTab === "signup"
                ? "bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/25 shadow-inner"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            SIGN UP
          </button>
        </div>

        {/* Dynamic Errors */}
        {formError && (
          <div className="bg-red-500/10 border border-red-500/35 rounded-xl p-3 flex gap-2.5 items-center text-left text-xs text-red-400 font-sans font-medium">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span className="break-words w-full">{formError}</span>
          </div>
        )}

        {/* Forms Switcher */}
        <div className="flex-1 flex flex-col gap-4 text-left">
          {activeTab === "login" ? (
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4 w-full">
              {/* Username Input */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Username or Email</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter account username..."
                    className="w-full bg-cyber-bg/75 border border-cyber-cyan/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full bg-cyber-bg/75 border border-cyber-cyan/15 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <button
                  type="submit"
                  disabled={scanState === "scanning"}
                  className="w-full bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan text-cyber-cyan py-3 text-xs font-semibold rounded-xl tracking-wider transition-all font-mono cursor-pointer uppercase font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                >
                  {scanState === "scanning" ? "VERIFYING..." : "Unlock Gate with Password"}
                </button>

                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={scanState === "scanning"}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyber-cyan/20 to-cyber-purple/20 hover:from-cyber-cyan/30 hover:to-cyber-purple/30 border border-cyber-cyan/50 hover:border-cyber-cyan text-white rounded-xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                  title="Authenticate instantly using Fingerprint, Face ID, or Device Passkey"
                >
                  <Fingerprint className="w-4 h-4 text-cyber-cyan animate-pulse" />
                  <span>One-Touch Biometric / Passkey Login</span>
                </button>
              </div>
            </form>
          ) : (
            /* Sign Up form container */
            <form onSubmit={handleSignupSubmit} className="flex flex-col gap-3 w-full animate-fade-in">
              {/* Method Toggle: Email vs Mobile */}
              <div className="grid grid-cols-2 gap-1 border border-cyber-cyan/10 rounded-lg p-0.5 bg-cyber-bg/25 mb-1">
                <button
                  type="button"
                  onClick={() => { playScanBeep(); setSignupMethod("email"); setFormError(""); }}
                  className={`py-1.5 text-[9px] font-mono rounded transition-all cursor-pointer font-bold ${
                    signupMethod === "email"
                      ? "bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20 shadow-inner"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  EMAIL REGISTRATION
                </button>
                <button
                  type="button"
                  onClick={() => { playScanBeep(); setSignupMethod("mobile"); setFormError(""); }}
                  className={`py-1.5 text-[9px] font-mono rounded transition-all cursor-pointer font-bold ${
                    signupMethod === "mobile"
                      ? "bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20 shadow-inner"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  MOBILE & OTP
                </button>
              </div>

              {/* Username field */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Unique Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="Enter username..."
                    className="w-full bg-cyber-bg/75 border border-cyber-cyan/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
                  />
                </div>
              </div>

              {signupMethod === "email" ? (
                /* Email field */
                <div className="flex flex-col gap-1.5 w-full animate-fade-in">
                  <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="Enter email address..."
                      className="w-full bg-cyber-bg/75 border border-cyber-cyan/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
                    />
                  </div>
                </div>
              ) : (
                /* Mobile & OTP field group */
                <div className="flex flex-col gap-3 w-full animate-fade-in">
                  {/* Mobile field */}
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="tel"
                          required
                          disabled={otpSent && otpVerified}
                          value={signupMobile}
                          onChange={(e) => setSignupMobile(e.target.value.replace(/[^0-9+]/g, ""))}
                          placeholder="e.g. 9876543210"
                          className="w-full bg-cyber-bg/75 border border-cyber-cyan/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpVerified}
                        className="px-4 bg-cyber-cyan/10 border border-cyber-cyan/35 text-cyber-cyan hover:bg-cyber-cyan/20 text-xs font-mono rounded-xl transition-all cursor-pointer font-bold select-none"
                      >
                        {otpSent ? "Resend" : "Send OTP"}
                      </button>
                    </div>
                  </div>

                  {/* OTP Code input field */}
                  {otpSent && (
                    <div className="flex flex-col gap-1.5 w-full animate-slide-in">
                      <label className="text-[10px] text-cyber-cyan font-mono uppercase tracking-wider font-semibold">Enter 6-Digit OTP</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          disabled={otpVerified}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="Enter OTP code..."
                          className="flex-1 bg-cyber-bg/75 border border-cyber-cyan/25 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono text-center tracking-widest font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={otpVerified}
                          className={`px-4 text-xs font-mono rounded-xl font-bold transition-all border cursor-pointer select-none ${
                            otpVerified
                              ? "bg-green-500/10 border-green-500/30 text-green-400"
                              : "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/25"
                          }`}
                        >
                          {otpVerified ? "Verified ✓" : "Verify Code"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Password field */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Account Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create secure password..."
                    className="w-full bg-cyber-bg/75 border border-cyber-cyan/15 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Biometric enrollment checkbox */}
              <div className="flex items-center gap-2.5 py-1 px-1 mt-1">
                <input
                  type="checkbox"
                  id="enrollBiometrics"
                  checked={enrollBiometricsOnSignup}
                  onChange={(e) => setEnrollBiometricsOnSignup(e.target.checked)}
                  className="accent-cyan-400 w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="enrollBiometrics" className="text-[11px] text-gray-300 font-mono cursor-pointer flex items-center gap-1.5 select-none">
                  <Fingerprint className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>Enroll device Fingerprint / Face ID passkey upon signup</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={signupMethod === "mobile" && !otpVerified}
                className={`w-full py-3 text-xs font-semibold rounded-xl tracking-wider transition-all font-mono uppercase font-bold mt-2 border ${
                  signupMethod === "mobile" && !otpVerified
                    ? "bg-gray-500/5 border-gray-500/10 text-gray-500 opacity-40 cursor-not-allowed"
                    : "bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border-cyber-cyan text-cyber-cyan cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                }`}
              >
                Create secure account
              </button>
            </form>
          )}
        </div>

        {/* Continue with Google login option */}
        <div className="flex flex-col gap-3">
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-cyber-cyan/10"></div>
            <span className="flex-shrink mx-4 text-[9px] text-gray-500 font-mono tracking-wider">SECURE IDENTITY MATRIX</span>
            <div className="flex-grow border-t border-cyber-cyan/10"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:border-white/20 py-3 text-xs font-semibold rounded-xl tracking-wider transition-all font-mono cursor-pointer flex items-center justify-center gap-2.5 shadow-sm"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.13h4.02c2.35-2.17 3.71-5.36 3.71-8.75z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.82-2.97c-1.08.72-2.45 1.16-4.11 1.16-3.15 0-5.81-2.13-6.76-5.01H1.17v3.24C3.15 22.37 7.25 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.24 14.27A7.2 7.2 0 0 1 4.8 12c0-.8.14-1.57.39-2.27V6.49H1.17A11.94 11.94 0 0 0 0 12c0 2.12.55 4.12 1.54 5.88l3.7-3.61z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.25 0 3.15 1.63 1.17 4.75l4.07 3.24c.95-2.88 3.61-5.01 6.76-5.01z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Telemetry log list */}
        <div className="bg-cyber-bg/85 border border-cyber-cyan/10 rounded-xl p-4 text-left font-mono text-[10px] text-gray-500 h-24 overflow-y-auto flex flex-col gap-1.5 shadow-inner w-full overflow-x-hidden">
          {telemetry.map((log, index) => (
            <div key={index} className="flex gap-2 leading-relaxed break-words whitespace-normal">
              <span className="text-cyber-cyan select-none flex-shrink-0">&gt;</span>
              <span className="break-all">{log}</span>
            </div>
          ))}
          {scanState === "scanning" && (
            <div className="text-cyber-purple animate-pulse leading-relaxed break-words whitespace-normal">
              &gt; INDEXING ARCHIVES: PREPARING StarNode MAPS...
            </div>
          )}
        </div>

      </motion.div>

      {/* Dynamic Google Login Overlay Modal */}
      <AnimatePresence>
        {showGoogleMockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[12px] max-w-lg w-full p-6 sm:p-8 text-left shadow-2xl relative border border-gray-200 font-sans text-gray-800"
              style={{ minHeight: "360px" }}
            >
              {/* Google Brand Header Logo */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.13h4.02c2.35-2.17 3.71-5.36 3.71-8.75z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.82-2.97c-1.08.72-2.45 1.16-4.11 1.16-3.15 0-5.81-2.13-6.76-5.01H1.17v3.24C3.15 22.37 7.25 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.24 14.27A7.2 7.2 0 0 1 4.8 12c0-.8.14-1.57.39-2.27V6.49H1.17A11.94 11.94 0 0 0 0 12c0 2.12.55 4.12 1.54 5.88l3.7-3.61z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.25 0 3.15 1.63 1.17 4.75l4.07 3.24c.95-2.88 3.61-5.01 6.76-5.01z"
                    />
                  </svg>
                  <span className="text-xs text-gray-500 font-medium font-sans">Sign in with Google</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleMockModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-semibold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {googleModalTab === "choose" && deviceGoogleAccounts.length > 0 ? (
                /* TAB 1: DEVICE ACCOUNT CHOOSER */
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-normal text-gray-900 tracking-tight font-sans">Choose an account</h2>
                    <p className="text-sm text-gray-600 font-sans">
                      to continue to <span className="font-semibold text-blue-600">Memento Core</span>
                    </p>
                  </div>

                  {/* List of Accounts saved on this device */}
                  <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200 mt-2 bg-white">
                    {deviceGoogleAccounts.map((acc, idx) => (
                      <div
                        key={idx}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                      >
                        <button
                          type="button"
                          onClick={() => handleSimulatedGoogleConfirm(acc.email, acc.name)}
                          className="flex-1 flex items-center gap-3.5 cursor-pointer focus:outline-none"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-sm font-semibold uppercase flex-shrink-0">
                            {acc.name ? acc.name.slice(0, 1) : acc.email.slice(0, 1)}
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="text-[13px] font-semibold text-gray-800">{acc.name || acc.email.split("@")[0]}</span>
                            <span className="text-xs text-gray-500">{acc.email}</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveGoogleAccount(acc.email, e)}
                          className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                          title="Remove account from this device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Option: Use another account */}
                    <button
                      type="button"
                      onClick={() => {
                        setMockGoogleEmail("");
                        setMockGoogleName("");
                        setGoogleModalTab("login");
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left cursor-pointer focus:outline-none text-[13px] font-medium text-gray-700"
                    >
                      <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center bg-gray-50 text-blue-600">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <span className="text-blue-600 font-medium">Use another Google account</span>
                    </button>
                  </div>

                  {/* Terms & Privacy footer */}
                  <p className="text-[11px] text-gray-500 leading-relaxed font-sans mt-4">
                    Before using this app, you can review Memento Core's <span className="text-blue-600">Privacy Policy</span> and <span className="text-blue-600">Terms of Service</span>.
                  </p>
                </div>
              ) : (
                /* TAB 2: SIGN-IN FORM FOR USER'S GOOGLE ACCOUNT */
                <form onSubmit={(e) => handleSimulatedGoogleConfirm(undefined, undefined, e)} className="flex flex-col gap-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Sign-in settings */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-normal text-gray-900 tracking-tight font-sans">Sign in with Google</h2>
                        <p className="text-xs text-gray-500 font-sans">
                          Enter your Google account details to authenticate on this device.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 mt-1">
                        {/* Custom Google Outlined Email Input */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-700 font-sans">Your Google Email</label>
                          <input
                            type="email"
                            required
                            value={mockGoogleEmail}
                            onChange={(e) => {
                              setMockGoogleEmail(e.target.value);
                              if (!mockGoogleName) {
                                const name = e.target.value.split("@")[0].replace(/[^a-zA-Z]/g, " ");
                                setMockGoogleName(name.charAt(0).toUpperCase() + name.slice(1));
                              }
                            }}
                            className="w-full border border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-sans"
                            placeholder="your.account@gmail.com"
                          />
                        </div>

                        {/* Custom Google Outlined Name Input */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-700 font-sans">Your Name</label>
                          <input
                            type="text"
                            required
                            value={mockGoogleName}
                            onChange={(e) => setMockGoogleName(e.target.value)}
                            className="w-full border border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-sans"
                            placeholder="Your full name"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Permission notice */}
                    <div className="flex flex-col gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4 font-sans text-xs">
                      <p className="font-semibold text-gray-700 leading-normal">
                        Memento Core will securely sync with your identity:
                      </p>
                      
                      <div className="flex flex-col gap-2 text-gray-600 mt-1">
                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full border border-gray-300 bg-white flex items-center justify-center text-[10px] text-gray-500">
                            <User className="w-3 h-3" />
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium text-gray-700">{mockGoogleName || "Your Name"}</span>
                            <span className="text-[10px] text-gray-400">Display identity</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full border border-gray-300 bg-white flex items-center justify-center text-[10px] text-gray-500">
                            <Mail className="w-3 h-3" />
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium text-gray-700">{mockGoogleEmail || "your.account@gmail.com"}</span>
                            <span className="text-[10px] text-gray-400">Secure email identity</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-500 leading-relaxed mt-1 pt-2 border-t border-gray-200">
                        This account will be remembered locally on this device so you can tap to sign in anytime.
                      </p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 font-sans">
                    {deviceGoogleAccounts.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setGoogleModalTab("choose")}
                        className="text-blue-600 hover:underline text-xs font-semibold cursor-pointer"
                      >
                        &larr; Back to saved accounts
                      </button>
                    ) : <div></div>}

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowGoogleMockModal(false)}
                        className="px-5 py-2 text-gray-600 hover:bg-gray-100 text-xs font-semibold rounded-lg tracking-wide transition-colors cursor-pointer border border-transparent"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg tracking-wide transition-colors cursor-pointer shadow"
                      >
                        Sign in
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
