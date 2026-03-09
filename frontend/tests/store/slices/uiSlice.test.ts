import uiReducer, {
  UIState,
  ModalType,
  ThemeMode,
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
  selectUI,
  selectActiveModal,
  selectModalData,
  selectIsLoading,
  selectLoadingMessage,
  selectTheme,
  selectSoundEnabled,
  selectAnimationsEnabled,
  selectToast,
  selectIsMobile,
  selectScreenWidth,
} from '../../../src/store/slices/uiSlice';

describe('uiSlice', () => {
  let initialState: UIState;

  beforeEach(() => {
    // Get fresh initial state for each test
    initialState = uiReducer(undefined, { type: '@@INIT' });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(initialState).toEqual({
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
      });
    });

    it('should initialize with auto theme', () => {
      expect(initialState.theme).toBe('auto');
    });

    it('should initialize with sound and animations enabled', () => {
      expect(initialState.soundEnabled).toBe(true);
      expect(initialState.animationsEnabled).toBe(true);
    });

    it('should initialize with no active modal', () => {
      expect(initialState.activeModal).toBe('none');
      expect(initialState.modalData).toBeNull();
    });

    it('should initialize with desktop screen size', () => {
      expect(initialState.screenWidth).toBe(1920);
      expect(initialState.isMobile).toBe(false);
    });
  });

  describe('modal management', () => {
    describe('showModal', () => {
      it('should show modal without data', () => {
        const action = showModal({ type: 'error' });
        const newState = uiReducer(initialState, action);

        expect(newState.activeModal).toBe('error');
        expect(newState.modalData).toBeNull();
      });

      it('should show modal with data', () => {
        const modalData = { message: 'Something went wrong', code: 500 };
        const action = showModal({ type: 'error', data: modalData });
        const newState = uiReducer(initialState, action);

        expect(newState.activeModal).toBe('error');
        expect(newState.modalData).toEqual(modalData);
      });

      it('should handle all modal types', () => {
        const modalTypes: ModalType[] = ['none', 'error', 'confirm', 'settings', 'leaveRoom'];

        modalTypes.forEach(type => {
          const action = showModal({ type });
          const newState = uiReducer(initialState, action);
          expect(newState.activeModal).toBe(type);
        });
      });

      it('should replace existing modal', () => {
        const stateWithModal = {
          ...initialState,
          activeModal: 'error' as ModalType,
          modalData: { oldData: 'test' },
        };

        const newModalData = { newData: 'updated' };
        const action = showModal({ type: 'confirm', data: newModalData });
        const newState = uiReducer(stateWithModal, action);

        expect(newState.activeModal).toBe('confirm');
        expect(newState.modalData).toEqual(newModalData);
      });

      it('should handle undefined data correctly', () => {
        const action = showModal({ type: 'settings', data: undefined });
        const newState = uiReducer(initialState, action);

        expect(newState.activeModal).toBe('settings');
        expect(newState.modalData).toBeNull();
      });
    });

    describe('hideModal', () => {
      it('should hide active modal', () => {
        const stateWithModal = {
          ...initialState,
          activeModal: 'error' as ModalType,
          modalData: { message: 'Error occurred' },
        };

        const action = hideModal();
        const newState = uiReducer(stateWithModal, action);

        expect(newState.activeModal).toBe('none');
        expect(newState.modalData).toBeNull();
      });

      it('should work when no modal is active', () => {
        const action = hideModal();
        const newState = uiReducer(initialState, action);

        expect(newState.activeModal).toBe('none');
        expect(newState.modalData).toBeNull();
      });

      it('should clear modal data', () => {
        const stateWithModal = {
          ...initialState,
          activeModal: 'confirm' as ModalType,
          modalData: { title: 'Confirm Action', callback: jest.fn() },
        };

        const action = hideModal();
        const newState = uiReducer(stateWithModal, action);

        expect(newState.modalData).toBeNull();
      });
    });
  });

  describe('loading state management', () => {
    describe('setLoading', () => {
      it('should set loading to true without message', () => {
        const action = setLoading({ isLoading: true });
        const newState = uiReducer(initialState, action);

        expect(newState.isLoading).toBe(true);
        expect(newState.loadingMessage).toBeNull();
      });

      it('should set loading to true with message', () => {
        const action = setLoading({ isLoading: true, message: 'Connecting to server...' });
        const newState = uiReducer(initialState, action);

        expect(newState.isLoading).toBe(true);
        expect(newState.loadingMessage).toBe('Connecting to server...');
      });

      it('should set loading to false', () => {
        const loadingState = {
          ...initialState,
          isLoading: true,
          loadingMessage: 'Loading...',
        };

        const action = setLoading({ isLoading: false });
        const newState = uiReducer(loadingState, action);

        expect(newState.isLoading).toBe(false);
        expect(newState.loadingMessage).toBeNull();
      });

      it('should set loading to false with message', () => {
        const loadingState = {
          ...initialState,
          isLoading: true,
          loadingMessage: 'Loading...',
        };

        const action = setLoading({ isLoading: false, message: 'Load complete' });
        const newState = uiReducer(loadingState, action);

        expect(newState.isLoading).toBe(false);
        expect(newState.loadingMessage).toBe('Load complete');
      });

      it('should handle undefined message', () => {
        const action = setLoading({ isLoading: true, message: undefined });
        const newState = uiReducer(initialState, action);

        expect(newState.isLoading).toBe(true);
        expect(newState.loadingMessage).toBeNull();
      });

      it('should handle empty message', () => {
        const action = setLoading({ isLoading: true, message: '' });
        const newState = uiReducer(initialState, action);

        expect(newState.isLoading).toBe(true);
        expect(newState.loadingMessage).toBeNull(); // Empty string is treated as falsy and becomes null
      });
    });
  });

  describe('theme management', () => {
    describe('setTheme', () => {
      it('should set light theme', () => {
        const action = setTheme('light');
        const newState = uiReducer(initialState, action);

        expect(newState.theme).toBe('light');
      });

      it('should set dark theme', () => {
        const action = setTheme('dark');
        const newState = uiReducer(initialState, action);

        expect(newState.theme).toBe('dark');
      });

      it('should set auto theme', () => {
        const stateWithLightTheme = {
          ...initialState,
          theme: 'light' as ThemeMode,
        };

        const action = setTheme('auto');
        const newState = uiReducer(stateWithLightTheme, action);

        expect(newState.theme).toBe('auto');
      });

      it('should handle all theme modes', () => {
        const themes: ThemeMode[] = ['light', 'dark', 'auto'];

        themes.forEach(theme => {
          const action = setTheme(theme);
          const newState = uiReducer(initialState, action);
          expect(newState.theme).toBe(theme);
        });
      });
    });
  });

  describe('sound management', () => {
    describe('toggleSound', () => {
      it('should toggle sound from enabled to disabled', () => {
        const action = toggleSound();
        const newState = uiReducer(initialState, action);

        expect(newState.soundEnabled).toBe(false);
      });

      it('should toggle sound from disabled to enabled', () => {
        const stateWithSoundDisabled = {
          ...initialState,
          soundEnabled: false,
        };

        const action = toggleSound();
        const newState = uiReducer(stateWithSoundDisabled, action);

        expect(newState.soundEnabled).toBe(true);
      });

      it('should toggle multiple times correctly', () => {
        let state = initialState;

        // Toggle off
        state = uiReducer(state, toggleSound());
        expect(state.soundEnabled).toBe(false);

        // Toggle on
        state = uiReducer(state, toggleSound());
        expect(state.soundEnabled).toBe(true);

        // Toggle off again
        state = uiReducer(state, toggleSound());
        expect(state.soundEnabled).toBe(false);
      });
    });

    describe('setSoundEnabled', () => {
      it('should set sound enabled to true', () => {
        const stateWithSoundDisabled = {
          ...initialState,
          soundEnabled: false,
        };

        const action = setSoundEnabled(true);
        const newState = uiReducer(stateWithSoundDisabled, action);

        expect(newState.soundEnabled).toBe(true);
      });

      it('should set sound enabled to false', () => {
        const action = setSoundEnabled(false);
        const newState = uiReducer(initialState, action);

        expect(newState.soundEnabled).toBe(false);
      });

      it('should work when setting same value', () => {
        const action = setSoundEnabled(true);
        const newState = uiReducer(initialState, action);

        expect(newState.soundEnabled).toBe(true);
      });
    });
  });

  describe('animations management', () => {
    describe('toggleAnimations', () => {
      it('should toggle animations from enabled to disabled', () => {
        const action = toggleAnimations();
        const newState = uiReducer(initialState, action);

        expect(newState.animationsEnabled).toBe(false);
      });

      it('should toggle animations from disabled to enabled', () => {
        const stateWithAnimationsDisabled = {
          ...initialState,
          animationsEnabled: false,
        };

        const action = toggleAnimations();
        const newState = uiReducer(stateWithAnimationsDisabled, action);

        expect(newState.animationsEnabled).toBe(true);
      });

      it('should toggle multiple times correctly', () => {
        let state = initialState;

        // Toggle off
        state = uiReducer(state, toggleAnimations());
        expect(state.animationsEnabled).toBe(false);

        // Toggle on
        state = uiReducer(state, toggleAnimations());
        expect(state.animationsEnabled).toBe(true);
      });
    });

    describe('setAnimationsEnabled', () => {
      it('should set animations enabled to true', () => {
        const stateWithAnimationsDisabled = {
          ...initialState,
          animationsEnabled: false,
        };

        const action = setAnimationsEnabled(true);
        const newState = uiReducer(stateWithAnimationsDisabled, action);

        expect(newState.animationsEnabled).toBe(true);
      });

      it('should set animations enabled to false', () => {
        const action = setAnimationsEnabled(false);
        const newState = uiReducer(initialState, action);

        expect(newState.animationsEnabled).toBe(false);
      });

      it('should work when setting same value', () => {
        const action = setAnimationsEnabled(true);
        const newState = uiReducer(initialState, action);

        expect(newState.animationsEnabled).toBe(true);
      });
    });
  });

  describe('sidebar management', () => {
    describe('toggleSidebar', () => {
      it('should toggle sidebar from expanded to collapsed', () => {
        const action = toggleSidebar();
        const newState = uiReducer(initialState, action);

        expect(newState.sidebarCollapsed).toBe(true);
      });

      it('should toggle sidebar from collapsed to expanded', () => {
        const stateWithCollapsedSidebar = {
          ...initialState,
          sidebarCollapsed: true,
        };

        const action = toggleSidebar();
        const newState = uiReducer(stateWithCollapsedSidebar, action);

        expect(newState.sidebarCollapsed).toBe(false);
      });

      it('should toggle multiple times correctly', () => {
        let state = initialState;

        // Toggle collapsed
        state = uiReducer(state, toggleSidebar());
        expect(state.sidebarCollapsed).toBe(true);

        // Toggle expanded
        state = uiReducer(state, toggleSidebar());
        expect(state.sidebarCollapsed).toBe(false);
      });
    });

    describe('setSidebarCollapsed', () => {
      it('should set sidebar collapsed to true', () => {
        const action = setSidebarCollapsed(true);
        const newState = uiReducer(initialState, action);

        expect(newState.sidebarCollapsed).toBe(true);
      });

      it('should set sidebar collapsed to false', () => {
        const stateWithCollapsedSidebar = {
          ...initialState,
          sidebarCollapsed: true,
        };

        const action = setSidebarCollapsed(false);
        const newState = uiReducer(stateWithCollapsedSidebar, action);

        expect(newState.sidebarCollapsed).toBe(false);
      });

      it('should work when setting same value', () => {
        const action = setSidebarCollapsed(false);
        const newState = uiReducer(initialState, action);

        expect(newState.sidebarCollapsed).toBe(false);
      });
    });
  });

  describe('toast management', () => {
    describe('showToast', () => {
      it('should show toast with message only', () => {
        const action = showToast({ message: 'Success!' });
        const newState = uiReducer(initialState, action);

        expect(newState.toast).toEqual({
          message: 'Success!',
          type: 'info',
          visible: true,
          autoHide: true,
        });
      });

      it('should show toast with custom type', () => {
        const action = showToast({ message: 'Error occurred', type: 'error' });
        const newState = uiReducer(initialState, action);

        expect(newState.toast).toEqual({
          message: 'Error occurred',
          type: 'error',
          visible: true,
          autoHide: true,
        });
      });

      it('should show toast with autoHide disabled', () => {
        const action = showToast({ 
          message: 'Persistent message', 
          type: 'warning',
          autoHide: false 
        });
        const newState = uiReducer(initialState, action);

        expect(newState.toast).toEqual({
          message: 'Persistent message',
          type: 'warning',
          visible: true,
          autoHide: false,
        });
      });

      it('should handle all toast types', () => {
        const toastTypes: Array<'success' | 'error' | 'warning' | 'info'> = 
          ['success', 'error', 'warning', 'info'];

        toastTypes.forEach(type => {
          const action = showToast({ message: `${type} message`, type });
          const newState = uiReducer(initialState, action);
          
          expect(newState.toast?.type).toBe(type);
          expect(newState.toast?.message).toBe(`${type} message`);
        });
      });

      it('should replace existing toast', () => {
        const stateWithToast = {
          ...initialState,
          toast: {
            message: 'Old toast',
            type: 'info' as const,
            visible: true,
            autoHide: true,
          },
        };

        const action = showToast({ message: 'New toast', type: 'success' });
        const newState = uiReducer(stateWithToast, action);

        expect(newState.toast).toEqual({
          message: 'New toast',
          type: 'success',
          visible: true,
          autoHide: true,
        });
      });

      it('should use default type when not provided', () => {
        const action = showToast({ message: 'Test message' });
        const newState = uiReducer(initialState, action);

        expect(newState.toast?.type).toBe('info');
      });

      it('should use default autoHide when not provided', () => {
        const action = showToast({ message: 'Test message', type: 'success' });
        const newState = uiReducer(initialState, action);

        expect(newState.toast?.autoHide).toBe(true);
      });

      it('should handle autoHide: false explicitly', () => {
        const action = showToast({ 
          message: 'Test message', 
          type: 'error',
          autoHide: false 
        });
        const newState = uiReducer(initialState, action);

        expect(newState.toast?.autoHide).toBe(false);
      });
    });

    describe('hideToast', () => {
      it('should hide visible toast', () => {
        const stateWithToast = {
          ...initialState,
          toast: {
            message: 'Test toast',
            type: 'info' as const,
            visible: true,
            autoHide: true,
          },
        };

        const action = hideToast();
        const newState = uiReducer(stateWithToast, action);

        expect(newState.toast).toEqual({
          message: 'Test toast',
          type: 'info',
          visible: false,
          autoHide: true,
        });
      });

      it('should handle hidden toast', () => {
        const stateWithHiddenToast = {
          ...initialState,
          toast: {
            message: 'Test toast',
            type: 'info' as const,
            visible: false,
            autoHide: true,
          },
        };

        const action = hideToast();
        const newState = uiReducer(stateWithHiddenToast, action);

        expect(newState.toast?.visible).toBe(false);
      });

      it('should handle when no toast exists', () => {
        const action = hideToast();
        const newState = uiReducer(initialState, action);

        expect(newState.toast).toBeNull();
      });

      it('should preserve toast data when hiding', () => {
        const stateWithToast = {
          ...initialState,
          toast: {
            message: 'Important message',
            type: 'warning' as const,
            visible: true,
            autoHide: false,
          },
        };

        const action = hideToast();
        const newState = uiReducer(stateWithToast, action);

        expect(newState.toast?.message).toBe('Important message');
        expect(newState.toast?.type).toBe('warning');
        expect(newState.toast?.autoHide).toBe(false);
      });
    });

    describe('clearToast', () => {
      it('should clear existing toast', () => {
        const stateWithToast = {
          ...initialState,
          toast: {
            message: 'Test toast',
            type: 'info' as const,
            visible: true,
            autoHide: true,
          },
        };

        const action = clearToast();
        const newState = uiReducer(stateWithToast, action);

        expect(newState.toast).toBeNull();
      });

      it('should handle when no toast exists', () => {
        const action = clearToast();
        const newState = uiReducer(initialState, action);

        expect(newState.toast).toBeNull();
      });

      it('should clear hidden toast', () => {
        const stateWithHiddenToast = {
          ...initialState,
          toast: {
            message: 'Hidden toast',
            type: 'error' as const,
            visible: false,
            autoHide: true,
          },
        };

        const action = clearToast();
        const newState = uiReducer(stateWithHiddenToast, action);

        expect(newState.toast).toBeNull();
      });
    });
  });

  describe('screen size management', () => {
    describe('setScreenSize', () => {
      it('should set desktop screen size', () => {
        const action = setScreenSize({ width: 1920, isMobile: false });
        const newState = uiReducer(initialState, action);

        expect(newState.screenWidth).toBe(1920);
        expect(newState.isMobile).toBe(false);
      });

      it('should set mobile screen size', () => {
        const action = setScreenSize({ width: 375, isMobile: true });
        const newState = uiReducer(initialState, action);

        expect(newState.screenWidth).toBe(375);
        expect(newState.isMobile).toBe(true);
      });

      it('should set tablet screen size', () => {
        const action = setScreenSize({ width: 768, isMobile: false });
        const newState = uiReducer(initialState, action);

        expect(newState.screenWidth).toBe(768);
        expect(newState.isMobile).toBe(false);
      });

      it('should update from mobile to desktop', () => {
        const mobileState = {
          ...initialState,
          screenWidth: 375,
          isMobile: true,
        };

        const action = setScreenSize({ width: 1440, isMobile: false });
        const newState = uiReducer(mobileState, action);

        expect(newState.screenWidth).toBe(1440);
        expect(newState.isMobile).toBe(false);
      });

      it('should update from desktop to mobile', () => {
        const desktopState = {
          ...initialState,
          screenWidth: 1920,
          isMobile: false,
        };

        const action = setScreenSize({ width: 390, isMobile: true });
        const newState = uiReducer(desktopState, action);

        expect(newState.screenWidth).toBe(390);
        expect(newState.isMobile).toBe(true);
      });

      it('should handle very large screen sizes', () => {
        const action = setScreenSize({ width: 3840, isMobile: false });
        const newState = uiReducer(initialState, action);

        expect(newState.screenWidth).toBe(3840);
        expect(newState.isMobile).toBe(false);
      });

      it('should handle very small screen sizes', () => {
        const action = setScreenSize({ width: 320, isMobile: true });
        const newState = uiReducer(initialState, action);

        expect(newState.screenWidth).toBe(320);
        expect(newState.isMobile).toBe(true);
      });
    });
  });

  describe('resetUI', () => {
    it('should reset all UI state to initial values', () => {
      const modifiedState: UIState = {
        activeModal: 'error',
        modalData: { message: 'Error occurred' },
        isLoading: true,
        loadingMessage: 'Loading...',
        theme: 'dark',
        soundEnabled: false,
        animationsEnabled: false,
        sidebarCollapsed: true,
        toast: {
          message: 'Test toast',
          type: 'success',
          visible: true,
          autoHide: false,
        },
        isMobile: true,
        screenWidth: 375,
      };

      const action = resetUI();
      const newState = uiReducer(modifiedState, action);

      expect(newState).toEqual(initialState);
    });

    it('should work when already in initial state', () => {
      const action = resetUI();
      const newState = uiReducer(initialState, action);

      expect(newState).toEqual(initialState);
    });
  });

  describe('selectors', () => {
    const mockState = {
      ui: {
        activeModal: 'settings' as ModalType,
        modalData: { tab: 'audio' },
        isLoading: true,
        loadingMessage: 'Saving settings...',
        theme: 'dark' as ThemeMode,
        soundEnabled: false,
        animationsEnabled: true,
        sidebarCollapsed: true,
        toast: {
          message: 'Settings saved',
          type: 'success' as const,
          visible: true,
          autoHide: true,
        },
        isMobile: true,
        screenWidth: 768,
      },
    };

    it('should select entire UI state', () => {
      expect(selectUI(mockState)).toEqual(mockState.ui);
    });

    it('should select active modal', () => {
      expect(selectActiveModal(mockState)).toBe('settings');
    });

    it('should select modal data', () => {
      expect(selectModalData(mockState)).toEqual({ tab: 'audio' });
    });

    it('should select loading state', () => {
      expect(selectIsLoading(mockState)).toBe(true);
    });

    it('should select loading message', () => {
      expect(selectLoadingMessage(mockState)).toBe('Saving settings...');
    });

    it('should select theme', () => {
      expect(selectTheme(mockState)).toBe('dark');
    });

    it('should select sound enabled', () => {
      expect(selectSoundEnabled(mockState)).toBe(false);
    });

    it('should select animations enabled', () => {
      expect(selectAnimationsEnabled(mockState)).toBe(true);
    });

    it('should select toast', () => {
      expect(selectToast(mockState)).toEqual({
        message: 'Settings saved',
        type: 'success',
        visible: true,
        autoHide: true,
      });
    });

    it('should select mobile state', () => {
      expect(selectIsMobile(mockState)).toBe(true);
    });

    it('should select screen width', () => {
      expect(selectScreenWidth(mockState)).toBe(768);
    });

    it('should handle null values in selectors', () => {
      const stateWithNulls = {
        ui: {
          ...initialState,
          modalData: null,
          loadingMessage: null,
          toast: null,
        },
      };

      expect(selectModalData(stateWithNulls)).toBeNull();
      expect(selectLoadingMessage(stateWithNulls)).toBeNull();
      expect(selectToast(stateWithNulls)).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete modal flow', () => {
      let state = initialState;

      // Show modal
      state = uiReducer(state, showModal({ 
        type: 'confirm', 
        data: { title: 'Delete Item', message: 'Are you sure?' }
      }));

      expect(state.activeModal).toBe('confirm');
      expect(state.modalData).toEqual({ title: 'Delete Item', message: 'Are you sure?' });

      // Hide modal
      state = uiReducer(state, hideModal());

      expect(state.activeModal).toBe('none');
      expect(state.modalData).toBeNull();
    });

    it('should handle complete toast flow', () => {
      let state = initialState;

      // Show toast
      state = uiReducer(state, showToast({ 
        message: 'File uploaded successfully', 
        type: 'success' 
      }));

      expect(state.toast?.message).toBe('File uploaded successfully');
      expect(state.toast?.visible).toBe(true);

      // Hide toast
      state = uiReducer(state, hideToast());

      expect(state.toast?.visible).toBe(false);

      // Clear toast
      state = uiReducer(state, clearToast());

      expect(state.toast).toBeNull();
    });

    it('should handle settings management flow', () => {
      let state = initialState;

      // Change theme
      state = uiReducer(state, setTheme('dark'));
      expect(state.theme).toBe('dark');

      // Toggle sound off
      state = uiReducer(state, toggleSound());
      expect(state.soundEnabled).toBe(false);

      // Disable animations
      state = uiReducer(state, setAnimationsEnabled(false));
      expect(state.animationsEnabled).toBe(false);

      // Collapse sidebar
      state = uiReducer(state, setSidebarCollapsed(true));
      expect(state.sidebarCollapsed).toBe(true);
    });

    it('should handle responsive design flow', () => {
      let state = initialState;

      // Start on desktop
      expect(state.screenWidth).toBe(1920);
      expect(state.isMobile).toBe(false);

      // Resize to tablet
      state = uiReducer(state, setScreenSize({ width: 768, isMobile: false }));
      expect(state.screenWidth).toBe(768);
      expect(state.isMobile).toBe(false);

      // Resize to mobile
      state = uiReducer(state, setScreenSize({ width: 375, isMobile: true }));
      expect(state.screenWidth).toBe(375);
      expect(state.isMobile).toBe(true);

      // Auto-collapse sidebar on mobile might be handled elsewhere
      // But we can test the state is maintained
      expect(state.sidebarCollapsed).toBe(false); // Still from initial state
    });

    it('should handle loading states properly', () => {
      let state = initialState;

      // Start loading
      state = uiReducer(state, setLoading({ isLoading: true, message: 'Connecting...' }));
      expect(state.isLoading).toBe(true);
      expect(state.loadingMessage).toBe('Connecting...');

      // Update loading message
      state = uiReducer(state, setLoading({ isLoading: true, message: 'Authenticating...' }));
      expect(state.isLoading).toBe(true);
      expect(state.loadingMessage).toBe('Authenticating...');

      // Stop loading
      state = uiReducer(state, setLoading({ isLoading: false }));
      expect(state.isLoading).toBe(false);
      expect(state.loadingMessage).toBeNull();
    });

    it('should maintain state immutability', () => {
      const originalState = { ...initialState };
      const newState = uiReducer(initialState, showModal({ type: 'error' }));

      expect(newState).not.toBe(initialState);
      expect(initialState).toEqual(originalState);
    });

    it('should handle complex state combinations', () => {
      let state = initialState;

      // Set up complex UI state
      state = uiReducer(state, showModal({ type: 'settings', data: { section: 'audio' } }));
      state = uiReducer(state, setLoading({ isLoading: true, message: 'Applying settings...' }));
      state = uiReducer(state, showToast({ message: 'Settings updated', type: 'success' }));
      state = uiReducer(state, setTheme('dark'));
      state = uiReducer(state, setSoundEnabled(false));
      state = uiReducer(state, setScreenSize({ width: 1024, isMobile: false }));

      expect(state.activeModal).toBe('settings');
      expect(state.isLoading).toBe(true);
      expect(state.toast?.type).toBe('success');
      expect(state.theme).toBe('dark');
      expect(state.soundEnabled).toBe(false);
      expect(state.screenWidth).toBe(1024);

      // Reset everything
      state = uiReducer(state, resetUI());

      expect(state).toEqual(initialState);
    });
  });
});
