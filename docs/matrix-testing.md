# Matrix effect preview

The `feature/matrix-effects` branch contains the local `0.2.0_rc1` preview.
This is not a published release. OpenWrt package version: `0.2.0_rc1-r2`.

## Try it

1. Open **System → Termix Theme → Effects**.
2. Enable **Enable Matrix effect**, apply, and reload the page.
3. Optionally select the **Matrix** accent on **Appearance** for the green
   palette. Any other accent works too.
4. Try **Everywhere**, **Content only**, and **Sidebar and top bar**.
   **No code rain** keeps only the selected static effects.
5. Change the interval, size and opacity, then apply and reload.

The effect starts disabled and keeps its options when turned off. It is
inactive in light mode, including when **Follow system** switches to light.
Reduced motion, a hidden browser tab, or an open LuCI dialog suspends the
effect without a background animation loop. The login screen also supports
the effect; its login dialog does not suspend it.

## Device checks

- Test on a desktop, a high-DPI screen, and a physical phone. A narrow
  desktop viewport alone does not reproduce mobile rendering.
- Open and close the mobile drawer in every rain area. Check the drawer's
  close button, backdrop, Escape, focus, scroll and section collapsing.
- Confirm rain does not add page overflow or intercept controls.
- Confirm the green palette works with the master effect disabled.
- Test a different accent, custom HEX, light mode, and system mode.
- Open a harmless dialog (for example pending appearance changes) and
  confirm rain and scanlines pause, then resume after closing it.
- Enable the device's reduced motion preference and switch away from the
  tab. Confirm animation stops and resumes when appropriate.
- Inspect Overview, theme settings, a form, a table and a third-party app.
- Check readability at the highest allowed opacity and performance on a
  phone. Adjust defaults before release if needed.

## Automated checks

```sh
node --check htdocs/luci-static/termix/matrix.js
node --check htdocs/luci-static/resources/view/termix/settings.js
node --test tests/matrix.test.cjs
git diff --check
```

The Node tests exercise animation scheduling, suspension, high-DPI backing
store limits, desktop clipping and the mobile drawer geometry. They do not
replace visual checks in a real browser or physical device.

## Preview verification (2026-10-15)

- OpenWrt 25.12.5 x86/64, LuCI `26.273.20498~1fcad1e`.
- Built using the OpenWrt 25.12.5 x86/64 SDK and the original pinned LuCI
  feed. The package contains static theme assets and does not replace LuCI.
- Nine Node lifecycle and geometry tests pass; both modified templates
  compile with the target's ucode interpreter.
- In the Codex in-app browser: Appearance/Effects tabs, dependent fields,
  keyboard slider input, numeric input, saving and applying UCI values,
  retaining parameters after disabling, and Matrix palette with no effects.
- Light mode suppresses effects. During the LuCI apply dialog the active
  effect attribute switches off and returns after the dialog closes.
- At 412 CSS px: no horizontal overflow, usable controls, opening/closing
  the drawer, and rain visible in the drawer for the chrome-only area.
- Physical phone rendering and sustained client CPU/battery use await
  manual testing before a public release.

## Revert the appearance

Disable **Enable Matrix effect** and choose the previous accent. Over SSH:

```sh
uci set termix.settings.matrix_fx='off'
uci set termix.settings.accent='orange'
uci commit termix
```

Reload the page. To revert the package itself, reinstall the previous
release APK with `apk add --allow-untrusted --allow-downgrade ./<package>.apk`.
Restore the saved `/etc/config/termix` only when its previous settings are
also needed. Do not restore the package database or router configuration.
