; Ewreka Ofis — ek kurulum adımları: her uygulama için ayrı kısayol
!macro ewrekaShortcut NAME MOD
  CreateShortCut "$SMPROGRAMS\Ewreka ${NAME}.lnk" "$appExe" "--module=${MOD}" "$INSTDIR\resources\icons\${MOD}.ico" 0 "" "" "Ewreka ${NAME}"
  WinShell::SetLnkAUMI "$SMPROGRAMS\Ewreka ${NAME}.lnk" "net.ewreka.${MOD}"
  CreateShortCut "$DESKTOP\Ewreka ${NAME}.lnk" "$appExe" "--module=${MOD}" "$INSTDIR\resources\icons\${MOD}.ico" 0 "" "" "Ewreka ${NAME}"
  WinShell::SetLnkAUMI "$DESKTOP\Ewreka ${NAME}.lnk" "net.ewreka.${MOD}"
!macroend

!macro customInstall
  !insertmacro ewrekaShortcut "Nota" "nota"
  !insertmacro ewrekaShortcut "Matrix" "matrix"
  !insertmacro ewrekaShortcut "Vista" "vista"
  !insertmacro ewrekaShortcut "Carta" "carta"
!macroend

!macro ewrekaRemove NAME
  Delete "$SMPROGRAMS\Ewreka ${NAME}.lnk"
  Delete "$DESKTOP\Ewreka ${NAME}.lnk"
!macroend

!macro customUnInstall
  !insertmacro ewrekaRemove "Nota"
  !insertmacro ewrekaRemove "Matrix"
  !insertmacro ewrekaRemove "Vista"
  !insertmacro ewrekaRemove "Carta"
!macroend
