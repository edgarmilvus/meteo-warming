// Rewrites the Android adaptive-icon XML that @capacitor/assets generates.
//
// The tool wraps both layers in `<inset 16.7%>` to keep art inside the safe
// zone. Our background *is* the artwork — the warming stripes — so the inset
// would frame it in white. Here the background fills the whole 108dp layer and
// the launcher mask crops it, which is the effect we want.
//
// Run after `npx capacitor-assets generate --android`:
//   node scripts/android-adaptive-icons.mjs

import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "android/app/src/main/res/mipmap-anydpi-v26");
if (!existsSync(dir)) {
  console.error(`No ${dir}. Add the Android platform first (npx cap add android).`);
  process.exit(1);
}

const XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

for (const name of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
  writeFileSync(join(dir, name), XML);
  console.log("written", join(dir, name));
}
