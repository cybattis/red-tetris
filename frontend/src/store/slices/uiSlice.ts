import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type ModalType = 'none' | 'error' | 'confirm' | 'settings' | 'leaveRoom';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface UIState {
  activeModal: ModalType;
  modalData: any;
  isLoading: boolean;
  loadingMessage: string | null;
  theme: ThemeMode;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  sidebarCollapsed: boolean;
  
  toast: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    visible: boolean;
    autoHide: boolean;
  } | null;
  
  isMobile: boolean;
  screenWidth: number;
}

const initialState: UIState = {
  activeModal: 'none',
  modalData: null,
  isLoading: false,
  loadingMessage: null,
  theme: 'auto',
  soundEnabled: true,
  animationsEnabled: true,
  sidebarCollapsed: false,
  toast: null,
  isMobile: false,
  screenWidth: 1920,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showModal: (state, action: PayloadAction<{ type: ModalType; data?: any }>) => {
      state.activeModal = action.payload.type;
      state.modalData = action.payload.data || null;
    },
    
    hideModal: (state) => {
      state.activeModal = 'none';
      state.modalData = null;
    },
    
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || null;
    },
    
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
    },
    
    toggleSound: (state) => {
      state.soundEnabled = !state.soundEnabled;
    },
    
    toggleAnimations: (state) => {
      state.animationsEnabled = !state.animationsEnabled;
    },
    
    setSoundEnabled: (state, action: PayloadAction<boolean>) => {
      state.soundEnabled = action.payload;
    },
    
    setAnimationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.animationsEnabled = action.payload;
    },
    
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    
    showToast: (state, action: PayloadAction<{
      message: string;
      type?: 'success' | 'error' | 'warning' | 'info';
      autoHide?: boolean;
    }>) => {
      state.toast = {
        message: action.payload.message,
        type: action.payload.type || 'info',
        visible: true,
        autoHide: action.payload.autoHide ?? true,
      };
    },
    
    hideToast: (state) => {
      if (state.toast) {
        state.toast.visible = false;
      }
    },
    
    clearToast: (state) => {
      state.toast = null;
    },
    
    setScreenSize: (state, action: PayloadAction<{ width: number; isMobile: boolean }>) => {
      state.screenWidth = action.payload.width;
      state.isMobile = action.payload.isMobile;
    },
    
    resetUI: () => {
      return initialState;
    },
  },
});

export const {
  showModal,
  hideModal,
  setLoading,
  setTheme,
  toggleSound,
  toggleAnimations,
  setSoundEnabled,
  setAnimationsEnabled,
  toggleSidebar,
  setSidebarCollapsed,
  showToast,
  hideToast,
  clearToast,
  setScreenSize,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;

export const selectUI = (state: { ui: UIState }) => state.ui;
export const selectActiveModal = (state: { ui: UIState }) => state.ui.activeModal;
export const selectModalData = (state: { ui: UIState }) => state.ui.modalData;
export const selectIsLoading = (state: { ui: UIState }) => state.ui.isLoading;
export const selectLoadingMessage = (state: { ui: UIState }) => state.ui.loadingMessage;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectSoundEnabled = (state: { ui: UIState }) => state.ui.soundEnabled;
export const selectAnimationsEnabled = (state: { ui: UIState }) => state.ui.animationsEnabled;
export const selectToast = (state: { ui: UIState }) => state.ui.toast;
export const selectIsMobile = (state: { ui: UIState }) => state.ui.isMobile;
export const selectScreenWidth = (state: { ui: UIState }) => state.ui.screenWidth;
