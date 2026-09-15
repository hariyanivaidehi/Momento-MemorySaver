"use client";

import React, { useState, useEffect } from "react";
import { Lock, Fingerprint, Eye, EyeOff, ShieldCheck, ShieldAlert, LogOut, KeyRound, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SetupLockScreenProps {
  username: string;
  onSetupComplete: () => void;
  onLogout: () => void;
}

export default function SetupLockScreen({ username, onSetupComplete, onLogout }: SetupLockScreenProps) {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Biometrics settings
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [useFingerprint, setUseFingerprint] = useState(false);

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
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      setIsBiometricSupported(true);
      
      // Check if already enrolled in WebAuthn on server
      fetch("/api/auth/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      })
      .then(res => {
        if (res.status === 200) {
          setIsEnrolled(true);
          setUseFingerprint(true);
        } else {
          const hasLocalCred = localStorage.getItem(`memento_lock_credential_id_${username}`);
          setIsEnrolled(!!hasLocalCred);
          setUseFingerprint(!!hasLocalCred);
        }
      })
      .catch(err => {
        console.error("Error checking biometric keys:", err);
        const hasLocalCred = localStorage.getItem(`memento_lock_credential_id_${username}`);
        setIsEnrolled(!!hasLocalCred);
        setUseFingerprint(!!hasLocalCred);
      });
    }
  }, [username]);

  // WebAuthn helpers
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

  const handleRegisterFingerprint = async () => {
    setError("");
    setIsEnrolling(true);
    playSynthBeep(880, 0.08);

    try {
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
        console.warn("Server biometric verify failed, falling back to local credentials:", err);
      }

      // Save credential ID locally for absolute reliability
      const cleanU = username.toLowerCase().trim();
      localStorage.setItem(`memento_lock_credential_id_${cleanU}`, credential.id);
      localStorage.setItem(`memento_lock_use_fingerprint_${cleanU}`, "true");
      setIsEnrolled(true);
      setUseFingerprint(true);
      playChime();
      setSuccessMsg("Biometrics registered successfully! Passkey enabled.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e: any) {
      console.error("Enrollment failed:", e);
      setError(e.message || "Biometric lock enrollment was cancelled or is unsupported.");
      playSynthBeep(220, 0.25);
    } finally {
      setIsEnrolling(false);
    }
  };

  const hashString = async (str: string): Promise<string> => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!passcode) {
      setError("Passcode is required.");
      playSynthBeep(220, 0.2);
      return;
    }

    if (passcode.length < 4) {
      setError("Passcode must be at least 4 characters long.");
      playSynthBeep(220, 0.2);
      return;
    }

    if (passcode !== confirmPasscode) {
      setError("Passcodes do not match.");
      playSynthBeep(220, 0.2);
      return;
    }

    try {
      const hashed = await hashString(passcode);
      localStorage.setItem(`memento_lock_password_${username}`, hashed);
      localStorage.setItem(`memento_lock_use_fingerprint_${username}`, useFingerprint ? "true" : "false");
      localStorage.setItem(`memento_is_locked_${username}`, "false");
      
      // Sync web lock passcode hash to server database
      try {
        await fetch("/api/auth/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            webLockPasscodeHash: hashed
          })
        });
      } catch (e) {
        console.warn("Failed to sync setup passcode to server database:", e);
      }

      playChime();
      onSetupComplete();
    } catch (err: any) {
      setError("Failed to save configuration. Please try again.");
      playSynthBeep(220, 0.2);
    }
  };

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
            Secure Web Lock Setup
          </h2>
          <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
            CONFIGURE A GATEWAY PASSCODE TO SECURE ACCESS
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

        {successMsg && (
          <div className="bg-cyber-green/10 border border-cyber-green/35 rounded-xl p-3 flex gap-2.5 items-center text-left text-xs text-cyber-green font-sans font-medium">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span className="break-words w-full">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {/* Passcode input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Create Lock Passcode</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPasscode ? "text" : "password"}
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Minimum 4 characters..."
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

          {/* Confirm passcode input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Confirm Lock Passcode</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPasscode ? "text" : "password"}
                required
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                placeholder="Re-enter passcode..."
                className="w-full bg-cyber-bg/75 border border-cyber-cyan/15 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
              />
            </div>
          </div>

          {/* Biometrics Setup Block if supported */}
          {isBiometricSupported && (
            <div className="flex flex-col gap-2 p-3 bg-cyber-bg/50 border border-cyber-cyan/10 rounded-xl mt-1">
              <span className="font-mono text-[9px] text-gray-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-cyber-cyan" />
                Link Biometric Fingerprint (Optional)
              </span>
              <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                Add an extra layer of access. Link your device fingerprint scanner to unlock your session instantly.
              </p>
              
              {!isEnrolled ? (
                <button
                  type="button"
                  onClick={handleRegisterFingerprint}
                  disabled={isEnrolling}
                  className="w-full bg-cyber-cyan/5 border border-cyber-cyan/20 hover:border-cyber-cyan text-cyber-cyan py-2 text-xs font-semibold rounded-lg tracking-wider font-mono cursor-pointer transition-all uppercase"
                >
                  {isEnrolling ? "Linking Scanner..." : "Link Fingerprint Device"}
                </button>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-[10px] text-cyber-green font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    LINKED SUCCESSFUL
                  </span>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useFingerprint}
                      onChange={(e) => setUseFingerprint(e.target.checked)}
                      className="accent-cyber-cyan w-3.5 h-3.5 rounded border-cyber-cyan/20 bg-cyber-bg text-cyber-cyan"
                    />
                    <span className="font-mono text-[10px] text-gray-300">Use Fingerprint</span>
                  </label>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan text-cyber-cyan py-3 text-xs font-semibold rounded-xl tracking-wider transition-all font-mono cursor-pointer uppercase font-bold mt-2"
          >
            Enable Web Lock & Continue
          </button>
        </form>

        {/* Logout Fallback Action */}
        <div className="border-t border-cyber-cyan/10 pt-4 flex justify-between items-center text-xs font-mono mt-2">
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
