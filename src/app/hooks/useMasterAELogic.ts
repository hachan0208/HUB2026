import { useState, useCallback } from "react";
import { useAppData } from "../lib/contexts/AppDataContext";
import { toast } from "sonner";

export type MasterAETab =
  | "Sheet1_AE"
  | "Bank_North_AE"
  | "Hold_AE"
  | "BulkPayment";

export function useMasterAELogic() {
  const { updateAppData } = useAppData();
  const [activeTab, setActiveTab] = useState<MasterAETab>("Sheet1_AE");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const processAEData = useCallback(() => {
    // This is primarily handled in AEDataConfig, but we can trigger a recalculation
    // if we want to ensure data is up to date based on current appData.
    toast.info("Vui lòng sử dụng trang Cấu hình AE để xử lý lại file gốc.");
  }, []);

  const reMapAECodes = useCallback(() => {
    updateAppData((prev) => {
      const aeMap = prev.AE_Map;
      const newData = prev.Sheet1_AE.data.map((row) => {
        // Try using _rawAE (original center string) or fallback to L07
        const rawCenterVal = String(row["_rawAE"] || row["L07"] || "").trim();
        const rawCenterKey = rawCenterVal.toUpperCase();

        if (aeMap[rawCenterKey]) {
          return {
            ...row,
            L07: aeMap[rawCenterKey].name,
            Business: aeMap[rawCenterKey].bus,
          };
        }
        return row;
      });
      return {
        ...prev,
        Sheet1_AE: { ...prev.Sheet1_AE, data: newData },
      };
    });
    toast.success("Đã cập nhật lại mã AE dựa trên bảng Map");
  }, [updateAppData]);

  const handleCellChange = useCallback(
    (
      tab: MasterAETab,
      rowIndex: number,
      columnKey: string,
      value: string | number | null,
    ) => {
      if (tab === "BulkPayment") return;
      updateAppData((prev) => {
        const data = [...prev[tab].data];
        data[rowIndex] = { ...data[rowIndex], [columnKey]: value };
        return {
          ...prev,
          [tab]: { ...prev[tab], data },
        };
      });
    },
    [updateAppData],
  );

  const handleDeleteRow = useCallback(
    (tab: MasterAETab, rowIndex: number) => {
      if (tab === "BulkPayment") return;
      updateAppData((prev) => {
        const data = [...prev[tab].data];
        data.splice(rowIndex, 1);
        return {
          ...prev,
          [tab]: { ...prev[tab], data },
        };
      });
      toast.success("Đã xóa dòng");
    },
    [updateAppData],
  );

  const clearAllData = useCallback(() => {
    updateAppData((prev) => ({
      ...prev,
      Sheet1_AE: { ...prev.Sheet1_AE, data: [] },
      Bank_North_AE: { ...prev.Bank_North_AE, data: [] },
      Hold_AE: { ...prev.Hold_AE, data: [] },
    }));
    toast.success("Đã xóa tất cả dữ liệu");
  }, [updateAppData]);

  return {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    showSearch,
    setShowSearch,
    processAEData,
    reMapAECodes,
    handleCellChange,
    handleDeleteRow,
    clearAllData,
  };
}
