"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from 'axios';

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      setStatus("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setStatus(null);
    
    try {
      const res = await axios.post("/api/auth/verify-otp", { email, otp });
      const data = res.data as { success?: boolean; error?: string };
      
      if (data.success) {
        setStatus("success");
      } else {
        const errorMessage = data.error || "Verification failed";
        setStatus(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Network error. Please try again.";
      setStatus(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (silent = false) => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    if (!silent) setStatus(null);
    
    try {
      const res = await axios.post("/api/auth/send-otp", { email });
      const data = res.data as { success?: boolean; error?: string; details?: string };
      
      if (data.success) {
        if (!silent) {
          setResent(true);
          setStatus("OTP sent to your email successfully.");
          // Clear status after 3 seconds
          setTimeout(() => setStatus(null), 3000);
        }
        setResendCooldown(60); // 60 second cooldown
      } else {
        const errorMessage = data.error || "Failed to send OTP";
        setStatus(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Network error. Please try again.";
      setStatus(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Verify Your Email</h2>
          <p className="text-gray-600">
            We've sent a verification code to
          </p>
          <p className="font-semibold text-blue-600 break-all">{email}</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter 6-digit verification code
            </label>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono tracking-widest bg-white text-gray-900"
              placeholder="000000"
              maxLength={6}
              disabled={loading}
            />
          </div>
          
          <button
            onClick={handleVerify}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              "Verify Email"
            )}
          </button>
          
          <button
            onClick={() => handleResend()}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium"
            disabled={loading || resendCooldown > 0}
          >
            {loading ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
          </button>
        </div>
        
        {status && (
          <div className={`mt-4 p-4 rounded-lg text-center ${
            status === "success" 
              ? "bg-green-100 text-green-700 border border-green-200" 
              : "bg-red-100 text-red-700 border border-red-200"
          }`}>
            {status === "success" ? (
              <div>
                <div className="flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-semibold mb-3">✅ Email verified successfully!</p>
                <button
                  className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  onClick={() => router.push("/signin")}
                >
                  Continue to Sign In
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm">{status}</p>
              </div>
            )}
          </div>
        )}
        
        {resent && !status && (
          <div className="mt-3 p-3 bg-green-100 text-green-700 rounded-lg text-center text-sm">
            ✅ New OTP sent successfully! Check your email.
          </div>
        )}
        
        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => router.push("/signin")}
            className="text-blue-600 hover:text-blue-500 underline text-sm"
          >
            Back to Sign In
          </button>
          
          <div className="text-xs text-gray-500">
            <p>Didn't receive the email? Check your spam folder.</p>
          </div>
        </div>
      </div>
    </div>
  );
}