"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (data.success) {
      setStatus("success");
    } else {
      setStatus(data.error || "Verification failed");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.success) {
      setResent(true);
      setStatus("OTP resent to your email.");
    } else {
      setStatus(data.error || "Failed to resend OTP");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Verify Your Email</h2>
        <p className="mb-4 text-center text-gray-600">An OTP has been sent to <span className="font-semibold">{email}</span>. Please enter it below.</p>
        <input
          type="text"
          value={otp}
          onChange={e => setOtp(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter OTP"
          maxLength={6}
        />
        <button
          onClick={handleVerify}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-2 disabled:bg-gray-400"
          disabled={loading || otp.length !== 6}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
        <button
          onClick={handleResend}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 mb-2"
          disabled={loading}
        >
          Resend OTP
        </button>
        {status && (
          <div className={`mt-2 text-center ${status === "success" ? "text-green-600" : "text-red-600"}`}>
            {status === "success" ? (
              <>
                Email verified! <br />
                <button
                  className="underline text-blue-600 mt-2"
                  onClick={() => router.push("/signin")}
                >
                  Go to Sign In
                </button>
              </>
            ) : status}
          </div>
        )}
        {resent && <div className="mt-2 text-green-600 text-center">OTP resent!</div>}
      </div>
    </div>
  );
} 