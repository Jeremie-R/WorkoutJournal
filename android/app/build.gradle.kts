import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

// The web app this shell opens full screen. Its /.well-known/assetlinks.json must list this
// app's signing key, or Chrome shows a URL bar instead of running it as a trusted app.
val webHost = "workout.app.roberrini.com"

// Release signing: keystore.properties (gitignored) next to settings.gradle.kts, if present.
val keystoreProperties = Properties().apply {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

android {
    namespace = "com.roberrini.workout"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.roberrini.workout"
        minSdk = 28
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
        manifestPlaceholders["webHost"] = webHost
        manifestPlaceholders["webUrl"] = "https://$webHost/"
        // The app's half of the link with the website (the site's half is assetlinks.json).
        resValue(
            "string",
            "asset_statements",
            """[{ \"relation\": [\"delegate_permission/common.handle_all_urls\"], \"target\": { \"namespace\": \"web\", \"site\": \"https://$webHost\" } }]""",
        )
    }

    buildFeatures {
        resValues = true
    }

    signingConfigs {
        if (keystoreProperties.isNotEmpty()) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // The app is only a shell; shrinking drops the unused library code (most of the APK).
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("release")
        }
    }
}

dependencies {
    implementation(libs.androidbrowserhelper)
}
