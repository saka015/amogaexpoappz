import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Constants from 'expo-constants';
import { Session } from "@supabase/supabase-js";
import { fetch } from "expo/fetch";
import { supabase } from "@/config/supabase";
import { Platform } from "react-native";
import config from "@/config";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const extractParamsFromUrl = (url: string) => {
	// Handles URLs like storchat://authenticating#access_token=...&refresh_token=...
	const hashIndex = url.indexOf('#');
	if (hashIndex === -1) return {};
	const params = new URLSearchParams(url.substring(hashIndex + 1));
	return {
		access_token: params.get("access_token"),
		expires_in: parseInt(params.get("expires_in") || "0"),
		refresh_token: params.get("refresh_token"),
		token_type: params.get("token_type"),
		provider_token: params.get("provider_token"),
	};
};

export const extractParamsFromQuery = (url: string) => {
	// Handles URLs like storchat://authenticating?access_token=...&refresh_token=...
	const queryIndex = url.indexOf('?');
	if (queryIndex === -1) return {};
	const params = new URLSearchParams(url.substring(queryIndex + 1));
	return {
		access_token: params.get("access_token"),
		expires_in: parseInt(params.get("expires_in") || "0"),
		refresh_token: params.get("refresh_token"),
		token_type: params.get("token_type"),
		provider_token: params.get("provider_token"),
	};
};

export const generateAPIUrl = (relativePath: string) => {
	const origin = Constants.experienceUrl?.replace('exp://', 'http://') ?? config.EXPO_PUBLIC_API_URL;

	const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

	if (config.NODE_ENV === 'development') {
		return origin.concat(path);
	}

	if (!config.EXPO_PUBLIC_API_URL) {
		throw new Error(
			'EXPO_PUBLIC_API_URL environment variable is not defined',
		);
	}

	return config.EXPO_PUBLIC_API_URL.concat(path);
};

export const expoFetchWithAuth = (session: Session | null) => (url: RequestInfo | URL, options: RequestInit = {}) => {
	const sanitizedOptions: RequestInit = {
		...options,
		headers: {
			...(options.headers ?? {}),
			"Content-Type": "application/json",
			"Authorization": `Bearer ${session?.access_token}`,
		},
	};
	if (sanitizedOptions.body === null) {
		delete sanitizedOptions.body;
	}
	return fetch(url as string, sanitizedOptions as any);
};

function base64ToBlob(base64: string, mime: string): Blob {
	const byteCharacters = atob(base64.split(',')[1]);
	const byteArrays = [];

	for (let offset = 0; offset < byteCharacters.length; offset += 512) {
		const slice = byteCharacters.slice(offset, offset + 512);
		const byteNumbers = new Array(slice.length).fill(0).map((_, i) => slice.charCodeAt(i));
		byteArrays.push(new Uint8Array(byteNumbers));
	}

	return new Blob(byteArrays, { type: mime });
}

export async function uploadAttachmentToSupabase(localPath: string, fileName: string, contentType: string, bucketName: string, baseFolder: string = "uploads"): Promise<string> {
	try {
		let fileBlob: any;
		if (Platform.OS === 'web') {
			fileBlob = base64ToBlob(localPath, contentType);
		} else {
			const response = await fetch(localPath);
			fileBlob = await response.arrayBuffer();
		}

		const { data, error } = await supabase.storage
			.from(bucketName)
			.upload(`${baseFolder}${baseFolder ? '/' : ''}${Date.now()}-${fileName}`, fileBlob, {
				contentType,
				upsert: true,
			});

		if (error) throw error;

		const { data: publicUrl } = supabase
			.storage
			.from(bucketName)
			.getPublicUrl(data.path);

		return publicUrl.publicUrl;
	} catch (err: any) {
		console.error("📦 Upload error:", err.message);
		return "";
	}
}