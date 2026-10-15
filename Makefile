include $(TOPDIR)/rules.mk

PKG_NAME:=luci-theme-termix
PKG_VERSION:=0.2.0_rc1
PKG_RELEASE:=2
PKG_LICENSE:=Apache-2.0
PKG_LICENSE_FILES:=LICENSE

LUCI_TITLE:=Termix-inspired theme for LuCI
LUCI_DESCRIPTION:=A responsive, terminal-inspired LuCI theme with a sidebar layout.
LUCI_DEPENDS:=+luci-base
LUCI_PKGARCH:=all
LUCI_MAINTAINER:=Termix theme contributors
LUCI_URL:=https://github.com/konstantinhidirov/luci-theme-termix

# Keep the shipped CSS and JavaScript readable.
LUCI_MINIFY_CSS:=0
LUCI_MINIFY_JS:=0

define Package/luci-theme-termix/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	if [ "$$(uci -q get luci.main.mediaurlbase)" = '/luci-static/termix' ]; then
		uci set luci.main.mediaurlbase='/luci-static/bootstrap'
	fi
	uci -q delete luci.themes.Termix
	uci commit luci
}
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot package scan signature
