// 文件: render/table/LongTextDialog.tsx

import React, { useEffect, useState } from "react";
import Button from "render/web/ui/Button";
import { Dialog } from "render/web/ui/modal/Dialog";

export interface LongTextCellInfo {
    dbKey: string;
    columnName: string;
    columnLabel: string;
    rowTitle?: string;
    value: string;
}

interface LongTextDialogProps {
    payload: LongTextCellInfo | null;
    onClose: () => void;
    onSave: (params: {
        dbKey: string;
        columnName: string;
        value: string;
    }) => void;
}

const LongTextDialog: React.FC<LongTextDialogProps> = ({
    payload,
    onClose,
    onSave,
}) => {
    const [draft, setDraft] = useState("");

    useEffect(() => {
        if (payload) {
            setDraft(payload.value ?? "");
        } else {
            setDraft("");
        }
    }, [payload]);

    const handleCancel = () => {
        onClose();
    };

    const handleSave = () => {
        if (!payload) return;
        const { dbKey, columnName, value: oldValue } = payload;

        if (draft === String(oldValue ?? "")) {
            onClose();
            return;
        }

        onSave({ dbKey, columnName, value: draft });
        onClose();
    };

    return (
        <Dialog
            isOpen={!!payload
            }
            onClose={handleCancel}
            size="xlarge"
            title={
                payload ? (
                    <div style={{ display: "flex", flexDirection: "column" }} >
                        <span>{payload.columnLabel} </span>
                        {
                            payload.rowTitle && (
                                <span
                                    style={
                                        {
                                            fontSize: "var(--fontSize-sm)",
                                            color: "var(--textTertiary)",
                                            marginTop: 2,
                                        }
                                    }
                                >
                                    {payload.rowTitle}
                                </span>
                            )
                        }
                    </div>
                ) : null
            }
        >
            <div
                style={
                    {
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        minHeight: 260,
                    }
                }
            >
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label={payload?.columnLabel ?? "Long text"}
                    style={{
                        flex: 1,
                        width: "100%",
                        minHeight: 220,
                        resize: "vertical",
                        fontFamily: "inherit",
                        fontSize: "var(--fontSize-base)",
                        lineHeight: "var(--leading-relaxed)",
                        padding: "12px 14px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        background: "var(--backgroundSecondary)",
                        color: "var(--text)",
                        outline: "none",
                    }}
                />
                < div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 4,
                    }}
                >
                    <Button variant="ghost" size="small" onClick={handleCancel} >
                        取消
                    </Button>
                    < Button variant="primary" size="small" onClick={handleSave} >
                        保存
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

export default LongTextDialog;