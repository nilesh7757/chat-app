'use client';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [checkingEnv, setCheckingEnv] = useState(false);

  const handleTestEmail = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    setStatus(null);
    setErrorDetails(null);

    try {
      const res = await axios.post('/api/test-email', { email });
      const data = res.data as { details?: string; error?: string };
      if (res.status === 200) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorDetails(data.details || data.error || 'Unknown error');
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorDetails('Network error or server not responding');
      toast.error('Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEnv = async () => {
    setCheckingEnv(true);
    try {
      const res = await axios.get('/api/check-env');
      setEnvStatus(res.data);
    } catch (error) {
      setEnvStatus({ error: 'Failed to check environment' });
    } finally {
      setCheckingEnv(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Test Email Configuration</h2>
        
        {/* Environment Check Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Environment Configuration</h3>
          <button
            onClick={handleCheckEnv}
            disabled={checkingEnv}
            className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 disabled:bg-gray-400 mb-2"
          >
            {checkingEnv ? "Checking..." : "Check Environment Variables"}
          </button>
          
          {envStatus && (
            <div className="text-sm">
              {envStatus.success ? (
                <div>
                  <div className="mb-2">
                    <span className="font-semibold">Email Config: </span>
                    <span className={envStatus.emailConfigured ? "text-green-600" : "text-red-600"}>
                      {envStatus.emailConfigured ? "✅ Configured" : "❌ Not configured"}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Method: </span>
                    <span className="text-blue-600">{envStatus.emailMethod}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">All Required: </span>
                    <span className={envStatus.allRequired ? "text-green-600" : "text-red-600"}>
                      {envStatus.allRequired ? "✅ Ready" : "❌ Missing"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-red-600">Failed to check environment</div>
              )}
            </div>
          )}
        </div>

        <p className="mb-4 text-center text-gray-600">
          Enter your email address to test if the email configuration is working properly.
        </p>
        
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your email address"
        />
        
        <button
          onClick={handleTestEmail}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-2 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Test Email"}
        </button>

        {status === 'success' && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            ✅ Test email sent successfully! Check your inbox.
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <div className="font-semibold mb-2">❌ Failed to send test email</div>
            {errorDetails && (
              <div className="text-sm mt-2 p-2 bg-red-50 rounded">
                <strong>Error Details:</strong><br />
                <code className="text-xs break-all">{errorDetails}</code>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Email Configuration Requirements:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Gmail account with 2-factor authentication enabled</li>
            <li>App password generated for "Mail"</li>
            <li>GMAIL_USER and GMAIL_PASS environment variables set</li>
          </ul>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold text-blue-800 mb-2">How to set up Gmail App Password:</h4>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Go to <a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Account settings</a></li>
              <li>Security → 2-Step Verification → App passwords</li>
              <li>Select "Mail" and generate password</li>
              <li>Add to your .env.local file:
                <pre className="mt-1 text-xs bg-blue-100 p-2 rounded">
GMAIL_USER=your-email@gmail.com<br />
GMAIL_PASS=your-16-char-app-password
                </pre>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 