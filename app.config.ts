
const STAGE = process.env.STAGE || 'development';
const publicUrl = process.env.EXPO_PUBLIC_API_URL ?? "";

export default () => {
	const isDev = STAGE === 'development';
	const isPreview = STAGE === 'preview';
	const isProd = STAGE === 'production';

	return {
		name: isDev ? 'stor.chat (Dev)' : isPreview ? 'stor.chat (Preview)' : 'stor.chat',
		"slug": "storchat",
		"scheme": "storchat",
		"version": "1.0.0",
		"orientation": "portrait",
		"icon": "./assets/icon.png",
		"userInterfaceStyle": "automatic",
		"assetBundlePatterns": ["**/*"],
		"newArchEnabled": true,
		"ios": {
			"supportsTablet": true,
			"config": {
				"usesNonExemptEncryption": false
			},
			"splash": {
				"image": "./assets/splash.png",
				"resizeMode": "cover",
				"backgroundColor": "#ffffff",
				"dark": {
					"backgroundColor": "#000000",
					"resizeMode": "cover",
					"image": "./assets/splash-dark.png"
				}
			},
			"icon": {
				"dark": "./assets/icon-dark.png",
				"light": "./assets/icon.png"
			},
			"bundleIdentifier": "ai.stor.chat",
			// bundleIdentifier: isDev
			// 	? 'ai.stor.chat.dev'
			// 	: isPreview
			// 		? 'ai.stor.chat.preview'
			// 		: 'ai.stor.chat',
		},
		"android": {
			"adaptiveIcon": {
				"foregroundImage": "./assets/adaptive-icon.png"
			},
			"splash": {
				"image": "./assets/splash.png",
				"resizeMode": "cover",
				"backgroundColor": "#ffffff",
				"dark": {
					"backgroundColor": "#000000",
					"resizeMode": "cover",
					"image": "./assets/splash-dark.png"
				}
			},
			"package": "ai.stor.chat",
			// package: isDev
			// 	? 'ai.stor.chat.dev'
			// 	: isPreview
			// 		? 'ai.stor.chat.preview'
			// 		: 'ai.stor.chat',
			"googleServicesFile": "./google-services.json",
			"permissions": [
				"android.permission.RECORD_AUDIO",
				"android.permission.MODIFY_AUDIO_SETTINGS"
			]
		},
		"web": {
			"output": "server"
		},
		"experiments": {
			"typedRoutes": true,
			"reactServerFunctions": true
		},
		"plugins": [
			[
				"expo-router",
				{
					"origin": publicUrl
				}
			],
			"expo-secure-store",
			"expo-web-browser",
			[
				"expo-build-properties",
				{
					"ios": {}
				}
			],
			[
				"expo-document-picker",
				{
					"iCloudContainerEnvironment": "Production"
				}
			],
			[
				"expo-image-picker",
				{
					"photosPermission": "The app accesses your photos to let you share them with your friends."
				}
			],
			[
				"expo-audio",
				{
					"microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone."
				}
			],
			[
				"expo-video",
				{
					"supportsBackgroundPlayback": true,
					"supportsPictureInPicture": true
				}
			],
			"expo-font"
		],
		"owner": "tahabou",
		"extra": {
			"router": {
				"origin": publicUrl
			},
			"eas": {
				"projectId": "594bac0b-e4a3-419c-85e9-17630336239b"
			}
		}
	}
}