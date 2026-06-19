# Full Repository Upload - 1.3.0

1. Extract the release ZIP.
2. Open the extracted folder.
3. Upload every file and folder inside it to the root of `TrulyBoredAdventure/Sus-Alert-Updated`.
4. Replace existing files when prompted.
5. Confirm that `vendor/alt1/`, `assets/statues/`, `scripts/`, and `.github/workflows/` are present after the upload.
6. Delete `scripts/legacy-loader.js` from the repository if GitHub did not remove it automatically.
7. Wait for GitHub Pages and the verification workflow to finish.
8. Remove the previous app entry from Alt1.
9. Reinstall with:

```text
alt1://addapp/https://trulyboredadventure.github.io/Sus-Alert-Updated/appconfig.json
```

The extracted outer folder itself should not appear as a nested folder in the repository.
