(() => {
	try {
		// The 'CLEANUP_TASKS' variable is passed from the YAML 'env' block.
		// We provide a default of an empty string.
		const tasksString = CLEANUP_TASKS || "";

		// If no tasks are specified in the YAML, we can exit early.
		if (tasksString === "") {
			console.log("[Maestro] No cleanup tasks specified. Skipping.");
			return; // Exit the script
		}

		// Convert the comma-separated string from YAML into a proper array.
		const tasksArray = tasksString.split(",");

		const CLEANUP_URL = `${HELPER_API_HOST}/api/maestro-helper/cleanup`;

		console.log(`[Maestro] Triggering cleanup with tasks: [${tasksString}]...`);

		const response = http.post(CLEANUP_URL, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${MAESTRO_SECRET}`,
			},
			// Construct the JSON body with the tasks array.
			body: JSON.stringify({
				tasks: tasksArray,
				userEmail: TESTING_EMAIL,
				imapConfig: {
					host: IMAP_HOST,
					port: IMAP_PORT,
					user: TESTING_EMAIL,
					password: IMAP_PASSWORD,
				},
			}),
		});

		if (!response.ok) {
			throw new Error(
				`Cleanup API call failed with status ${response.status}: ${response.body}`,
			);
		}

		const result = json(response.body);
		console.log(`[Maestro] Cleanup task completed: ${result.message}`);
		// Optional: Log the detailed results from the server
		if (result.results) {
			result.results.forEach((res) => console.log(`  - ${res}`));
		}
	} catch (e) {
		throw new Error(
			`[Maestro] A critical error occurred during cleanup: ${e.toString()}`,
		);
	}
})();
