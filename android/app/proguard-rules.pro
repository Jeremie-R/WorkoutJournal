# android-browser-helper refers to some of its own components by class (the launcher enables
# ManageDataLauncherActivity at start), which must keep their names to match the manifest. Keep it
# intact; the unused AndroidX and Guava code it pulls in is still removed.
-keep class com.google.androidbrowserhelper.** { *; }
