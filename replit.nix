{pkgs}: {
  deps = [
    pkgs.alsa-lib
    pkgs.gtk3
    pkgs.at-spi2-atk
    pkgs.dbus
    pkgs.expat
    pkgs.xorg.libXext
    pkgs.xorg.libX11
    pkgs.xorg.libxcb
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.mesa
    pkgs.libdrm
    pkgs.cups
    pkgs.nss
    pkgs.chromium
  ];
}
