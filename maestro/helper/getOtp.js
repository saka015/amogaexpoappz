(() => {
	try {
		// --- 1. Configuration ---
		// URL of the API route you created in your Expo server.
		// During local development, this will be your computer's IP or localhost.
		const API_HELPER_URL = `${HELPER_API_HOST}/api/maestro-helper/get-otp`; // Adjust port if needed

		console.log(
			`[Maestro HTTP] Woke up. Calling helper API at ${API_HELPER_URL}...`,
		);

		// --- 2. Make the API Call using Maestro's http.post ---
		// This is a synchronous call.
		const response = http.post(API_HELPER_URL, {
			headers: {
				// The Authorization header is crucial for security.
				"Content-Type": "application/json",
				Authorization: `Bearer ${MAESTRO_SECRET}`,
			},
			body: JSON.stringify({
				imapConfig: {
					host: IMAP_HOST,
					port: IMAP_PORT,
					user: TESTING_EMAIL,
					password: IMAP_PASSWORD,
				},
			}),
		});

		// --- 3. Handle the Response ---
		// Check the 'ok' property on the response object.
		if (!response.ok) {
			// The response body is already a string.
			throw new Error(
				`API Helper call failed with status ${response.status}: ${response.body}`,
			);
		}

		// Use the global json() function to parse the response body string.
		const data = json(response.body);

		// Check for an error message within the JSON payload from our server.
		if (data.error) {
			throw new Error(`API Helper returned an error: ${data.error}`);
		}

		// --- 4. Set the Output ---
		// Extract the OTP from the JSON response and set it for Maestro to use.
		output.otp = data.otp;
		console.log(
			`[Maestro HTTP] Successfully retrieved OTP from server: ${output.otp}`,
		);
	} catch (e) {
		console.error("[Maestro HTTP] A critical error occurred:", e.toString());
		throw new Error(`API Helper returned an error: ${e.toString()}`);
		output.otp = "API_CALL_FAILED"; // Set a specific error code for debugging.
	}
})();
