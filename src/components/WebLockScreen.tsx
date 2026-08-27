"use client";

import React, { useState, useEffect } from "react";
import { Lock, Unlock, Fingerprint, KeyRound, Eye, EyeOff, ShieldAlert, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WebLockScreenProps {
  username: string;
  onUnlock: () => void;
  onLogout: () => void;
}

export default function WebLockScreen({ username, onUnlock, onLogout }: WebLockScreenProps) {
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState("");
  const [hasFingerprint, setHasFingerprint] = useState(false);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "failed">("idle");

  // Audio FX
  const playSynthBeep = (freq = 587.33, duration = 0.1) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.015, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.0001, now + idx * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } catch (e) {}
  };  const hashString = async (str: string): Promise<string> => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
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
    if (msg.toLowerCase().includes("user account not found") || msg.toLowerCase().includes("not found")) {
      return "User account not found on server. Try logging in with your password first.";
    }
    return msg;
  };

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!passcode) {
      setError("Passcode is required.");
      playSynthBeep(220, 0.2);
      return;
    }

    try {
      const cleanUsername = username.toLowerCase().trim();
      const hashedInput = await hashString(passcode);

      // 1. Check custom lock passcode/PIN if set in localStorage
      const savedHash = localStorage.getItem(`memento_lock_password_${cleanUsername}`);
      if (savedHash) {
        if (hashedInput === savedHash) {
          setScanState("success");
          playChime();
          setTimeout(() => {
            onUnlock();
          }, 500);
          return;
        }
      }

      // 2. Fetch the latest profile from the server database to check if the PIN matches
      try {
        const profileRes = await fetch(`/api/auth/update-profile?username=${encodeURIComponent(cleanUsername)}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.success && profileData.user && profileData.user.webLockPasscodeHash) {
            if (hashedInput === profileData.user.webLockPasscodeHash) {
              localStorage.setItem(`memento_lock_password_${cleanUsername}`, profileData.user.webLockPasscodeHash);
              setScanState("success");
              playChime();
              setTimeout(() => {
                onUnlock();
              }, 500);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Failed to check passcode against database:", err);
      }

      // 3. Check client-side local users backup (for Sandbox mode password)
      const localUsers = JSON.parse(localStorage.getItem("memento_local_users") || "[]");
      const matchedLocal = localUsers.find(
        (u: any) => u.username === cleanUsername || u.email === cleanUsername
      );
      if (matchedLocal) {
        if (matchedLocal.passwordHash === hashedInput) {
          setScanState("success");
          playChime();
          setTimeout(() => {
            onUnlock();
          }, 500);
          return;
        }
      }

      // 4. Verify on server (for Cloud mode password)
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: cleanUsername, password: passcode })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setScanState("success");
        playChime();
        setTimeout(() => {
          onUnlock();
        }, 500);
        return;
      }

      // If all checks fail, throw explicit passcode error
      throw new Error("Incorrect passcode PIN.");
    } catch (e: any) {
      setError(e.message === "Incorrect passcode PIN." ? e.message : "Incorrect passcode PIN.");
      playSynthBeep(220, 0.25);
    }
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

  const handleFingerprintUnlock = async () => {
    setError("");
    setScanState("scanning");
    playSynthBeep(880, 0.08);

    try {
      let optionsData;
      let isLocalFallback = false;

      // 1. Try to fetch challenge options from server
      try {
        const res = await fetch("/api/auth/login/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username })
        });
        if (res.ok) {
          optionsData = await res.json();
          if (optionsData.error) {
            throw new Error(optionsData.error);
          }
        } else {
          throw new Error("Server options failed");
        }
      } catch (err) {
        console.warn("Server login options failed, trying local credentials lookup:", err);
        isLocalFallback = true;
      }

      if (isLocalFallback) {
        // Local WebAuthn challenge generation
        const localCredId = localStorage.getItem(`memento_lock_credential_id_${username}`);
        if (!localCredId) {
          throw new Error("No local biometric credentials found. Please link your fingerprint first.");
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        optionsData = {
          challenge: challenge.buffer,
          allowCredentials: [
            {
              type: "public-key" as const,
              id: base64URLToBuffer(localCredId)
            }
          ],
          userVerification: "required" as const
        };
      } else {
        // Decode server arrays
        optionsData.challenge = base64URLToBuffer(optionsData.challenge);
        optionsData.allowCredentials.forEach((c: any) => c.id = base64URLToBuffer(c.id));
      }

      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn biometric authentication unsupported on this browser.");
      }

      // 2. Launch browser credential check
      const assertion = (await navigator.credentials.get({
        publicKey: optionsData
      })) as PublicKeyCredential;

      if (!assertion) throw new Error("Verification scan returned empty.");

      // 3. Verify assertion signature
      if (isLocalFallback) {
        // Local validation: Touch ID/Windows Hello checked it natively on device
        setScanState("success");
        playChime();
        setTimeout(() => {
          onUnlock();
        }, 500);
      } else {
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
          body: JSON.stringify({ username, assertion: assertionJSON })
        });
        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          setScanState("success");
          playChime();
          setTimeout(() => {
            onUnlock();
          }, 500);
        } else {
          throw new Error(verifyData.error || "Biometric validation failed.");
        }
      }
    } catch (e: any) {
      console.error("Biometric verification failed:", e);
      setScanState("failed");
      playSynthBeep(220, 0.25);
      setError(getFriendlyErrorMessage(e));
    }
  };

  // Check if fingerprint is enabled for this user on mount (placed here so handleFingerprintUnlock is defined)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isEnrolled = localStorage.getItem(`memento_lock_use_fingerprint_${username}`) === "true";
      const hasLocalCred = !!localStorage.getItem(`memento_lock_credential_id_${username}`);
      
      // Only show fingerprint sensor if enabled AND we have a linked credential ID locally
      const activeBiometrics = isEnrolled && hasLocalCred;
      setHasFingerprint(activeBiometrics);
      
      if (activeBiometrics) {
        // Automatically trigger fingerprint prompt on load
        const timer = setTimeout(() => {
          handleFingerprintUnlock();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [username]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#01030a] via-[#040815] to-[#010103] cyber-grid relative overflow-hidden select-none z-50">
      {/* Laser grids & glowing spheres */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] rounded-full nebula-glow-1 pointer-events-none opacity-40"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full nebula-glow-2 pointer-events-none opacity-40"></div>
      
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="glass-panel border border-cyber-cyan/20 rounded-2xl p-6 sm:p-10 w-full max-w-md text-center flex flex-col gap-6 relative tech-panel shadow-2xl overflow-hidden"
      >
        {/* Holographic Lock Icon */}
        <div className="flex justify-center">
          <div className="relative p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Lock className="w-8 h-8 text-cyber-cyan animate-pulse" />
            <motion.div 
              className="absolute inset-0 rounded-full border border-cyber-cyan/40"
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-xl font-extrabold tracking-wider text-white uppercase glow-text-cyan">
            Memento Core Locked
          </h2>
          <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
            SECURE RE-AUTHENTICATION REQUIRED
          </span>
          <span className="font-mono text-xs text-cyber-cyan font-bold bg-cyber-cyan/5 py-1 px-3 rounded-full border border-cyber-cyan/15 max-w-max mx-auto mt-2 uppercase">
            User: {username}
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/35 rounded-xl p-3 flex gap-2.5 items-center text-left text-xs text-red-400 font-sans font-medium animate-shake">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span className="break-words w-full">{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {/* 1. Fingerprint Scanner Section (if enrolled) */}
          {hasFingerprint && (
            <div className="flex flex-col items-center gap-3 bg-cyber-bg/50 border border-cyber-cyan/10 rounded-xl p-4">
              <span className="font-mono text-[9px] text-gray-500 tracking-wider uppercase font-bold flex items-center gap-1.5 justify-center">
                <Fingerprint className="w-3.5 h-3.5 text-cyber-cyan" />
                Biometric Sensor Active
              </span>
              <button
                type="button"
                onClick={handleFingerprintUnlock}
                disabled={scanState === "scanning"}
                className={`p-5 rounded-full border transition-all relative ${
                  scanState === "scanning"
                    ? "bg-cyber-cyan/20 border-cyber-cyan shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                    : "bg-cyber-cyan/5 border-cyber-cyan/35 hover:border-cyber-cyan hover:bg-cyber-cyan/10 cursor-pointer"
                }`}
              >
                <Fingerprint className="w-10 h-10 text-cyber-cyan" />
                
                {/* Scan laser animation overlay */}
                {scanState === "scanning" && (
                  <motion.div 
                    className="absolute left-0 right-0 h-[2px] bg-cyber-cyan glow-text-cyan top-1/2"
                    animate={{ y: [-15, 15, -15] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  />
                )}
              </button>
              
              {scanState === "scanning" && (
                <div className="flex flex-col items-center gap-1.5 w-full mt-1.5 text-center">
                  <span className="font-mono text-[9px] text-cyber-cyan animate-pulse">PLACE FINGER ON SCANNER...</span>
                  <div className="w-full bg-cyber-bg border border-cyber-cyan/25 h-1 rounded-full overflow-hidden relative">
                    <motion.div 
                      className="bg-cyber-cyan h-full absolute top-0 bottom-0 w-1/3"
                      animate={{ left: ["-35%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                    />
                  </div>
                </div>
              )}
              
              {(scanState === "idle" || scanState === "failed") && (
                <span className="text-[10px] text-gray-400 font-sans">
                  {scanState === "failed" ? "Scan failed. Touch sensor to retry" : "Touch sensor to scan fingerprint"}
                </span>
              )}
            </div>
          )}

          {/* Divider if both are present */}
          {hasFingerprint && (
            <div className="flex items-center my-1 select-none">
              <div className="flex-grow border-t border-cyber-cyan/10"></div>
              <span className="mx-3 text-[9px] font-mono text-gray-500 uppercase tracking-widest">OR</span>
              <div className="flex-grow border-t border-cyber-cyan/10"></div>
            </div>
          )}

          {/* 2. Passcode Unlock Form */}
          <form onSubmit={handlePasswordUnlock} className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Web Lock Passcode</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPasscode ? "text" : "password"}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter Web Lock passcode..."
                  className="w-full bg-cyber-bg/75 border border-cyber-cyan/15 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan text-cyber-cyan py-3 text-xs font-semibold rounded-xl tracking-wider transition-all font-mono cursor-pointer uppercase font-bold"
            >
              Unlock Session
            </button>
          </form>
        </div>

        {/* Logout Fallback Action */}
        <div className="border-t border-cyber-cyan/10 pt-4 flex justify-between items-center text-xs font-mono">
          <span className="text-gray-500 uppercase text-[9px]">Need to change accounts?</span>
          <button
            onClick={() => {
              playSynthBeep(320, 0.2);
              onLogout();
            }}
            className="text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-all cursor-pointer font-bold font-mono text-[10px] uppercase tracking-wider bg-red-950/10 hover:bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/35"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit Session
          </button>
        </div>
      </motion.div>
    </div>
  );
}
