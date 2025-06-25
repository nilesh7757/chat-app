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

  // Auto-send OTP on page load
  useEffect(() => {
    if (email && initialLoad) {
      handleResend();
      setInitialLoad(false);
    }
  }, [email, initialLoad]);

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      setStatus("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setStatus(null);
    
    try {
      const res = await axios.post("/api/auth/verify-otp", { email, otp });
      const data = res.data;
      if (data.success) {
        setStatus("success");
      } else {
        setStatus(data.error || "Verification failed");
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setStatus(null);
    
    try {
      const res = await axios.post("/api/auth/send-otp", { email });
      const data = res.data;
      if (data.success) {
        setResent(true);
        setStatus("OTP sent to your email successfully.");
        // Clear status after 3 seconds
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus(data.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error('Resend error:', error);
      setStatus("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Verify Your Email</h2>
        <p className="mb-4 text-center text-gray-600">
          An OTP has been sent to <span className="font-semibold text-blue-600">{email}</span>. 
          Please enter it below.
        </p>
        
        <input
          type="text"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono tracking-widest"
          placeholder="000000"
          maxLength={6}
          disabled={loading}
        />
        
        <button
          onClick={handleVerify}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 mb-3 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          disabled={loading || otp.length !== 6}
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>
        
        <button
          onClick={handleResend}
          className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 mb-3 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          disabled={loading}
        >
          {loading ? "Sending..." : "Resend OTP"}
        </button>
        
        {status && (
          <div className={`mt-4 p-3 rounded-lg text-center ${
            status === "success" 
              ? "bg-green-100 text-green-700 border border-green-200" 
              : "bg-red-100 text-red-700 border border-red-200"
          }`}>
            {status === "success" ? (
              <div>
                <p className="font-semibold mb-2">✅ Email verified successfully!</p>
                <button
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                  onClick={() => router.push("/signin")}
                >
                  Go to Sign In
                </button>
              </div>
            ) : (
              <p>{status}</p>
            )}
          </div>
        )}
        
        {resent && (
          <div className="mt-3 p-2 bg-green-100 text-green-700 rounded text-center text-sm">
            ✅ OTP sent successfully!
          </div>
        )}
        
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/signin")}
            className="text-blue-600 hover:text-blue-500 underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
} 