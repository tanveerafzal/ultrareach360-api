export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Ultrareach360 API
          </h1>
          <p className="text-gray-600 mb-8">
            RESTful API for Ultrareach360 platform integration
          </p>

          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Authentication Endpoint
              </h2>

              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <div className="mb-4">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded mr-2">
                    POST
                  </span>
                  <code className="text-sm font-mono text-gray-900">
                    /v1/auth/login
                  </code>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Request Body:
                </h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`{
  "username": "user@example.com",
  "password": "your-password",
  "partner": "partner@example.com"
}`}
                </pre>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                  Success Response (200):
                </h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@example.com",
    "plan": "professional",
    "role": "user",
    "partner": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Partner Company",
      "email": "partner@example.com"
    }
  }
}`}
                </pre>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                  Error Responses:
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-semibold text-red-600">400 Bad Request:</span>
                    <pre className="bg-gray-900 text-red-400 p-2 rounded text-sm mt-1">
{`{
  "success": false,
  "error": "Please provide username, password, and partner"
}`}
                    </pre>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-red-600">401 Unauthorized:</span>
                    <pre className="bg-gray-900 text-red-400 p-2 rounded text-sm mt-1">
{`{
  "success": false,
  "error": "Invalid credentials"
}`}
                    </pre>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-red-600">403 Forbidden:</span>
                    <pre className="bg-gray-900 text-red-400 p-2 rounded text-sm mt-1">
{`{
  "success": false,
  "error": "API access not approved. Please request API access first.",
  "apiAccessStatus": "pending"
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Messaging Endpoints
              </h2>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Send Email
                  </h3>

                  <div className="mb-4">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded mr-2">
                      POST
                    </span>
                    <code className="text-sm font-mono text-gray-900">
                      /v1/messaging/send-email
                    </code>
                  </div>

                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Request Body:
                  </h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`{
  "businessGroup": "The North West Company",
  "to": "john@example.com",
  "subject": "Welcome",
  "body": "Hello John, this is your welcome email."
}`}
                  </pre>

                  <h4 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                    Success Response (200):
                  </h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "businessGroup": "The North West Company",
    "to": "john@example.com",
    "subject": "[The North West Company] Welcome",
    "sentAt": "2025-11-27T12:00:00.000Z"
  }
}`}
                  </pre>

                  <h4 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                    Error Responses:
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-semibold text-red-600">400 Bad Request:</span>
                      <pre className="bg-gray-900 text-red-400 p-2 rounded text-sm mt-1">
{`{
  "success": false,
  "error": "Please provide businessGroup, to, subject, and body"
}`}
                      </pre>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-red-600">400 Bad Request:</span>
                      <pre className="bg-gray-900 text-red-400 p-2 rounded text-sm mt-1">
{`{
  "success": false,
  "error": "Invalid email address format"
}`}
                      </pre>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-red-600">500 Internal Server Error:</span>
                      <pre className="bg-gray-900 text-red-400 p-2 rounded text-sm mt-1">
{`{
  "success": false,
  "error": "Email service is not configured. Please contact administrator."
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Send SMS
                  </h3>

                  <div className="mb-4">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded mr-2">
                      POST
                    </span>
                    <code className="text-sm font-mono text-gray-900">
                      /v1/messaging/send-sms
                    </code>
                  </div>

                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Request Body:
                  </h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`{
  "businessGroup": "The North West Company",
  "to": "+12345678901",
  "body": "Hello John, this is your welcome message."
}`}
                  </pre>

                  <h4 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                    Success Response (200):
                  </h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`{
  "success": true,
  "message": "SMS sent successfully",
  "data": {
    "businessGroup": "The North West Company",
    "to": "+12345678901",
    "messageId": "SM1234567890abcdef",
    "status": "queued",
    "sentAt": "2025-11-27T12:00:00.000Z",
    "segments": 1
  }
}`}
                  </pre>

                  <h4 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                    Error Responses:
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-semibold text-red-600">400 Bad Request:</span>
                      <pre className="bg-gray-900 text-red-400 p-2 rounded text-sm mt-1">
{`{
  "success": false,
  "error": "Please provide businessGroup, to, and body"
}`}
                      </pre>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-red-600">400 Bad Request:</span>
                      <pre className="bg-gray-900 text-red-400 p-2 rounded text-sm mt-1">
{`{
  "success": false,
  "error": "Invalid phone number format. Use E.164 format (e.g., +1234567890)"
}`}
                      </pre>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-red-600">400 Bad Request:</span>
                      <pre className="bg-gray-900 text-red-400 p-2 rounded text-sm mt-1">
{`{
  "success": false,
  "error": "Message body is too long. Maximum length is 1600 characters."
}`}
                      </pre>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-red-600">500 Internal Server Error:</span>
                      <pre className="bg-gray-900 text-red-400 p-2 rounded text-sm mt-1">
{`{
  "success": false,
  "error": "SMS service is not configured. Please contact administrator."
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Notes:
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>The user must belong to the specified partner</li>
                <li>The user must have API access status set to "approved"</li>
                <li>The token expires in 7 days</li>
                <li>All endpoints use JSON for request and response bodies</li>
                <li>Business group name is prefixed to all email subjects and SMS messages</li>
                <li>Phone numbers should be in E.164 format (e.g., +1234567890)</li>
                <li>SMS messages are limited to 1600 characters</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
