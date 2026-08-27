"use client";

import React, { useState, useEffect, useRef } from "react";
import { ShieldAlert, ShieldCheck, User, Mail, KeyRound, Eye, EyeOff, Phone } from "lucide-react";
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

  // Error & Status states
  const [formError, setFormError] = useState("");
  const [systemExists, setSystemExists] = useState(false);
  const [loginHasBiometrics, setLoginHasBiometrics] = useState(false);

  // Dynamic Biometrics Enrollment Detector
  useEffect(() => {
    if (!loginUsername.trim()) {
      setLoginHasBiometrics(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/auth/has-biometrics?usernameOrEmail=${encodeURIComponent(loginUsername)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setLoginHasBiometrics(data.hasBiometrics);
          } else {
            setLoginHasBiometrics(false);
          }
        })
        .catch(() => setLoginHasBiometrics(false));
    }, 450); // Debounce to minimize network noise

    return () => clearTimeout(timer);
  }, [loginUsername]);
  // Google Sign-In Mock States
  const [showGoogleMockModal, setShowGoogleMockModal] = useState(false);
  const [mockGoogleEmail, setMockGoogleEmail] = useState("hariyanivaidehi1@gmail.com");
  const [mockGoogleName, setMockGoogleName] = useState("Vaidehi Hariyani");
  const [googleModalTab, setGoogleModalTab] = useState<"choose" | "login">("choose");
  const [isGoogleSdkLoaded, setIsGoogleSdkLoaded] = useState(false);
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
      return "User account not found on server. Try logging in with your password first.";
    }
    return msg;
  };

  const handleBiometricLogin = async () => {
    setFormError("");
    if (!loginUsername) {
      setFormError("Enter your Username or Email to scan.");
      playFailBeep();
      return;
    }

    setScanState("scanning");
    playScanBeep();
    setTelemetry((prev) => [...prev, `SYSTEM: Requesting WebAuthn challenge for user [${loginUsername}]...`]);

    try {
      let options;
      let isLocalFallback = false;
      
      try {
        const res = await fetch("/api/auth/login/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: loginUsername })
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

      if (isLocalFallback) {
        const cleanUsername = loginUsername.toLowerCase().trim();
        const localCredId = localStorage.getItem(`memento_lock_credential_id_${cleanUsername}`);
        if (!localCredId) {
          throw new Error("No linked biometric credentials found for this account. Please log in with password.");
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
          userVerification: "required" as const
        };
      } else {
        options.challenge = base64URLToBuffer(options.challenge);
        options.allowCredentials.forEach((c: any) => c.id = base64URLToBuffer(c.id));
      }

      setTelemetry((prev) => [...prev, "SYSTEM: Launching system biometric scanner window..."]);

      const assertion = (await navigator.credentials.get({
        publicKey: options
      })) as PublicKeyCredential;

      if (!assertion) throw new Error("Verification scan returned null.");

      if (isLocalFallback) {
        setScanState("success");
        setTelemetry((prev) => [...prev, `SYSTEM: Cryptographic match locally! Welcoming [${loginUsername.toUpperCase()}].`]);
        
        const cleanUsername = loginUsername.toLowerCase().trim();
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
          body: JSON.stringify({ username: loginUsername, assertion: assertionJSON })
        });
        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          setScanState("success");
          setTelemetry((prev) => [...prev, `SYSTEM: Cryptographic match! Welcoming [${loginUsername.toUpperCase()}].`]);
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
        console.warn("Real Google prompt failed, falling back to simulated OAuth.", err);
        setShowGoogleMockModal(true);
      }
    } else {
      // Fallback simulated modal for testing
      setTelemetry(prev => [...prev, "SYSTEM: Real Client ID unconfigured. Invoking holographic simulated Google login..."]);
      setShowGoogleMockModal(true);
    }
  };
  const handleSimulatedGoogleConfirm = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowGoogleMockModal(false);
    setScanState("scanning");
    setTelemetry(prev => [...prev, `SYSTEM: Authenticating simulated Google account [${mockGoogleEmail}]...`]);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mockGoogleEmail, name: mockGoogleName })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Google login failed");

      setScanState("success");
      setTelemetry(prev => [...prev, `SYSTEM: Simulated Google Sync complete! Logged in as [${data.user.username.toUpperCase()}].`]);
      setTimeout(() => {
        playSynthChime();
        onVerifyRef.current(data.user);
      }, 600);
    } catch (err: any) {
      setScanState("failed");
      playFailBeep();
      setFormError(err.message || "Simulated Google Sign-in failed.");
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
                  className="flex-1 bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan text-cyber-cyan py-3 text-xs font-semibold rounded-xl tracking-wider transition-all font-mono cursor-pointer uppercase font-bold"
                >
                  {scanState === "scanning" ? "VERIFYING..." : "Unlock Gate"}
                </button>
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={scanState === "scanning" || !loginHasBiometrics}
                  className={`px-4 py-3 text-xs font-semibold rounded-xl tracking-wider transition-all font-mono cursor-pointer uppercase font-bold border ${
                    loginHasBiometrics
                      ? "bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border-cyber-cyan text-cyber-cyan shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse"
                      : "bg-gray-500/5 border-gray-500/10 text-gray-500 opacity-40 cursor-not-allowed"
                  }`}
                  title={loginHasBiometrics ? "Scan Biometric Key" : "No biometric credentials registered for this identity"}
                >
                  Scan Biometric
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

              <button
                type="submit"
                disabled={signupMethod === "mobile" && !otpVerified}
                className={`w-full py-3 text-xs font-semibold rounded-xl tracking-wider transition-all font-mono uppercase font-bold mt-2 border ${
                  signupMethod === "mobile" && !otpVerified
                    ? "bg-gray-500/5 border-gray-500/10 text-gray-500 opacity-40 cursor-not-allowed"
                    : "bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border-cyber-cyan text-cyber-cyan cursor-pointer"
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
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:border-white/20 py-3 text-xs font-semibold rounded-xl tracking-wider transition-all font-mono cursor-pointer flex items-center justify-center gap-2.5"
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
      {/* Simulated Google Login Overlay Modal */}
      <AnimatePresence>
        {showGoogleMockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[8px] max-w-lg w-full p-8 text-left shadow-2xl relative border border-gray-200 font-sans text-gray-800"
              style={{ minHeight: "360px" }}
            >
              {/* Google Brand Header Logo */}
              <div className="flex items-center gap-2 mb-6">
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

              {googleModalTab === "choose" ? (
                /* TAB 1: ACCOUNT CHOOSER (Exactly like media_1787219810309.png) */
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-normal text-gray-900 tracking-tight font-sans">Choose an account</h2>
                    <p className="text-sm text-gray-600 font-sans">
                      to continue to <span className="font-semibold text-blue-600">Memento Core</span>
                    </p>
                  </div>

                  {/* List of Accounts */}
                  <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200 mt-2 bg-white">
                    {/* Option 1: Saved Google Account */}
                    <button
                      type="button"
                      onClick={() => handleSimulatedGoogleConfirm()}
                      className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-gray-50 transition-colors text-left cursor-pointer focus:outline-none"
                    >
                      {/* Avatar with purple initial icon */}
                      <div className="w-8 h-8 rounded-full bg-[#673ab7] flex items-center justify-center text-white text-sm font-semibold uppercase">
                        {mockGoogleName.slice(0, 1)}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="text-[13px] font-semibold text-gray-800">{mockGoogleName}</span>
                        <span className="text-xs text-gray-500">{mockGoogleEmail}</span>
                      </div>
                    </button>

                    {/* Option 2: Use another account */}
                    <button
                      type="button"
                      onClick={() => setGoogleModalTab("login")}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left cursor-pointer focus:outline-none text-[13px] font-medium text-gray-700"
                    >
                      <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center bg-gray-50 text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                      </div>
                      <span>Use another account</span>
                    </button>
                  </div>

                  {/* Terms & Privacy footer */}
                  <p className="text-[11px] text-gray-500 leading-relaxed font-sans mt-4">
                    Before using this app, you can review Memento Core's <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-600 hover:underline">Privacy Policy</a> and <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-600 hover:underline">Terms of Service</a>.
                  </p>
                </div>
              ) : (
                /* TAB 2: SIGN-IN FORM (Exactly like media_1787219806199.png) */
                <form onSubmit={handleSimulatedGoogleConfirm} className="flex flex-col gap-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Sign-in settings */}
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-normal text-gray-900 tracking-tight font-sans">Sign in to Memento Core</h2>
                      </div>

                      <div className="flex flex-col gap-4 mt-2">
                        {/* Custom Google Outlined Email Input */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-600 font-sans">Google Account Email</label>
                          <input
                            type="email"
                            required
                            value={mockGoogleEmail}
                            onChange={(e) => {
                              setMockGoogleEmail(e.target.value);
                              const name = e.target.value.split("@")[0].replace(/[^a-zA-Z]/g, " ");
                              setMockGoogleName(name.charAt(0).toUpperCase() + name.slice(1));
                            }}
                            className="w-full border border-gray-300 hover:border-gray-400 rounded px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-sans"
                            placeholder="example@gmail.com"
                          />
                        </div>

                        {/* Custom Google Outlined Name Input */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-600 font-sans">Full Name</label>
                          <input
                            type="text"
                            required
                            value={mockGoogleName}
                            onChange={(e) => setMockGoogleName(e.target.value)}
                            className="w-full border border-gray-300 hover:border-gray-400 rounded px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-sans"
                            placeholder="Full name"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Permission notice */}
                    <div className="flex flex-col gap-3.5 bg-gray-50 border border-gray-200 rounded-lg p-4 font-sans text-xs">
                      <p className="font-semibold text-gray-700 leading-normal">
                        Google will allow Memento Core to access this info about you:
                      </p>
                      
                      <div className="flex flex-col gap-2.5 text-gray-600 mt-1">
                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full border border-gray-300 bg-white flex items-center justify-center text-[10px] text-gray-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium text-gray-700">{mockGoogleName}</span>
                            <span className="text-[10px] text-gray-400">Name and profile picture</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full border border-gray-300 bg-white flex items-center justify-center text-[10px] text-gray-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium text-gray-700">{mockGoogleEmail}</span>
                            <span className="text-[10px] text-gray-400">Email address</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-500 leading-relaxed mt-2 pt-2 border-t border-gray-200">
                        Review Memento Core's <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-600 hover:underline">privacy policy</a> and <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-600 hover:underline">Terms of Service</a> to understand how they will process your data.
                      </p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 font-sans">
                    <button
                      type="button"
                      onClick={() => setGoogleModalTab("choose")}
                      className="px-5 py-2.5 text-blue-600 hover:bg-blue-50 text-xs font-semibold rounded-full tracking-wide transition-colors cursor-pointer border border-transparent"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full tracking-wide transition-colors cursor-pointer shadow"
                    >
                      Continue
                    </button>
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
