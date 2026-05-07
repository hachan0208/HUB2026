/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { DEFAULT_CENTERS } from "../../constants";
import localforage from "localforage";
import { toast } from "sonner";
import { AppData } from "../../types";
import { INITIAL_APP_DATA } from "../../constants/initial-data";

// Configure localforage
localforage.config({
  name: "PayrollApp",
  storeName: "app_data",
});

const STORAGE_KEY = "PayrollApp_Data";

// ─── Split into 2 contexts to avoid re-rendering data consumers on meta changes ───

// ─── Split into 2 contexts to avoid re-rendering data consumers on meta changes ───

interface AppDataCtx {
  appData: AppData;
  isLoading: boolean;
}

interface AppActionsCtx {
  updateAppData: (
    updater: (prev: AppData) => AppData,
    saveToHistory?: boolean,
  ) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSyncing: boolean;
}

const AppDataContext = createContext<AppDataCtx | undefined>(undefined);
const AppActionsContext = createContext<AppActionsCtx | undefined>(undefined);

interface HistoryState {
  past: AppData[];
  present: AppData;
  future: AppData[];
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HistoryState>({
    past: [],
    present: INITIAL_APP_DATA,
    future: [],
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ── Load from storage on mount ──
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await localforage.getItem<AppData>(STORAGE_KEY);
        if (saved) {
          setState((prev) => ({
            ...prev,
            present: {
              ...saved,
              Final_Centers: {
                ...saved.Final_Centers,
                headers: INITIAL_APP_DATA.Final_Centers.headers,
              },
            },
          }));
        } else {
          const legacySaved = localStorage.getItem(STORAGE_KEY);
          if (legacySaved) {
            try {
              const parsed = JSON.parse(legacySaved);
              setState((prev) => ({
                ...prev,
                present: {
                  ...parsed,
                  Final_Centers: {
                    ...parsed.Final_Centers,
                    headers: INITIAL_APP_DATA.Final_Centers.headers,
                  },
                },
              }));
              await localforage.setItem(STORAGE_KEY, parsed);
            } catch (e) {
              console.error("Failed to parse legacy data", e);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load app data from storage", e);
        toast.error("Không thể tải dữ liệu đã lưu.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // ── Debounced sync to storage (1.5s) ──
  useEffect(() => {
    if (isLoading) return;

    const saveData = async () => {
      setIsSyncing(true);
      try {
        const dataToSave = { ...state.present };
        const stripFileObj = (item: any) => {
          const { fileObj, _file, ...rest } = item;
          return rest;
        };
        if (dataToSave.Fr_InputList)
          dataToSave.Fr_InputList = dataToSave.Fr_InputList.map(stripFileObj);
        if (dataToSave.Timesheet_InputList)
          dataToSave.Timesheet_InputList =
            dataToSave.Timesheet_InputList.map(stripFileObj);
        if (dataToSave.Ae_Global_Inputs)
          dataToSave.Ae_Global_Inputs =
            dataToSave.Ae_Global_Inputs.map(stripFileObj);
        await localforage.setItem(STORAGE_KEY, dataToSave);
      } catch (e) {
        console.error("Failed to save app data to storage", e);
        try {
          const minimalData = {
            ...state.present,
            Q_Staff: [],
            Q_Salary_Scale: [],
            Q_Roster: [],
            Q_Cache: [],
            Timesheets: [],
          };
          const stripFileObj = (item: any) => {
            const { fileObj, _file, ...rest } = item;
            return rest;
          };
          if (minimalData.Fr_InputList)
            minimalData.Fr_InputList =
              minimalData.Fr_InputList.map(stripFileObj);
          if (minimalData.Timesheet_InputList)
            minimalData.Timesheet_InputList =
              minimalData.Timesheet_InputList.map(stripFileObj);
          if (minimalData.Ae_Global_Inputs)
            minimalData.Ae_Global_Inputs =
              minimalData.Ae_Global_Inputs.map(stripFileObj);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalData));
        } catch (lsError) {
          console.error("LocalStorage also failed", lsError);
          toast.error("Không thể lưu dữ liệu: Bộ nhớ trình duyệt đã đầy.");
        }
      } finally {
        setIsSyncing(false);
      }
    };

    const id = setTimeout(saveData, 1500); // debounce 1.5s
    return () => clearTimeout(id);
  }, [state.present, isLoading]);

  // ── Default center seeding ──
  useEffect(() => {
    if (isLoading) return;
    setState((prev) => {
      const nextPresent = { ...prev.present };
      let changed = false;
      if (
        !prev.present.Fr_InputList ||
        prev.present.Fr_InputList.length === 0
      ) {
        nextPresent.Fr_InputList = DEFAULT_CENTERS.map((item, idx) => ({
          ...item,
          id: `default-${idx}`,
          status: "ready",
        }));
        changed = true;
      }
      if (
        !prev.present.Timesheet_InputList ||
        prev.present.Timesheet_InputList.length === 0
      ) {
        nextPresent.Timesheet_InputList = DEFAULT_CENTERS.map((item, idx) => ({
          ...item,
          id: `ts-default-${idx}`,
          status: "ready",
        }));
        changed = true;
      }
      if (!changed) return prev;
      return { ...prev, present: nextPresent };
    });
  }, [isLoading]);

  // ── Actions (stable references — never cause re-render) ──
  const updateAppData = useCallback(
    (updater: (prev: AppData) => AppData, saveToHistory: boolean = true) => {
      setState((prev) => {
        const nextPresent = updater(prev.present);
        if (nextPresent === prev.present) return prev;
        return {
          past: saveToHistory
            ? [...prev.past, prev.present].slice(-20)
            : prev.past,
          present: nextPresent,
          future: saveToHistory ? [] : prev.future,
        };
      });
    },
    [],
  );

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, []);

  // ── Memoized context values — only re-create when actual data changes ──
  const dataValue = useMemo<AppDataCtx>(
    () => ({ appData: state.present, isLoading }),
    [state.present, isLoading],
  );

  const actionsValue = useMemo<AppActionsCtx>(
    () => ({
      updateAppData,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      isSyncing,
    }),
    [
      updateAppData,
      undo,
      redo,
      state.past.length,
      state.future.length,
      isSyncing,
    ],
  );

  return (
    <AppDataContext.Provider value={dataValue}>
      <AppActionsContext.Provider value={actionsValue}>
        {children}
      </AppActionsContext.Provider>
    </AppDataContext.Provider>
  );
}

// ── Hooks ──

export function useAppData() {
  const dataCtx = useContext(AppDataContext);
  const actionsCtx = useContext(AppActionsContext);
  if (!dataCtx || !actionsCtx)
    throw new Error("useAppData must be used within AppDataProvider");
  // Merge để backward compatible — giữ nguyên API cũ
  return {
    appData: dataCtx.appData,
    isLoading: dataCtx.isLoading,
    updateAppData: actionsCtx.updateAppData,
    undo: actionsCtx.undo,
    redo: actionsCtx.redo,
    canUndo: actionsCtx.canUndo,
    canRedo: actionsCtx.canRedo,
    isSyncing: actionsCtx.isSyncing,
  };
}

/** Chỉ subscribe data — không re-render khi isSyncing/canUndo/canRedo thay đổi */
export function useAppDataOnly() {
  const ctx = useContext(AppDataContext);
  if (!ctx)
    throw new Error("useAppDataOnly must be used within AppDataProvider");
  return ctx;
}

/** Chỉ subscribe actions — không re-render khi data thay đổi */
export function useAppActions() {
  const ctx = useContext(AppActionsContext);
  if (!ctx)
    throw new Error("useAppActions must be used within AppDataProvider");
  return ctx;
}
