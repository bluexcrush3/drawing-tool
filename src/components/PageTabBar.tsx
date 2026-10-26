import React, { useState, useRef, useEffect } from 'react';
import {
    Plus,
    X,
    Copy,
    FileText,
    Check,
    Edit2,
} from 'lucide-react';
import type { DrawingPage, PaperSize } from '../types/drawing';

interface PageTabBarProps {
    pages: DrawingPage[];
    activePageId: string;
    onSelectPage: (id: string) => void;
    onAddPage: (paperSize: PaperSize, name?: string) => void;
    onRemovePage: (id: string) => void;
    onDuplicatePage: (id: string) => void;
    onRenamePage: (id: string, name: string) => void;
    currentPaperSize: PaperSize;
    onSelectPaperSize: (size: PaperSize) => void;
}

export const PageTabBar: React.FC<PageTabBarProps> = ({
    pages,
    activePageId,
    onSelectPage,
    onAddPage,
    onRemovePage,
    onDuplicatePage,
    onRenamePage,
    currentPaperSize,
    onSelectPaperSize,
}) => {
    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingPageId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingPageId]);

    const startEditing = (p: DrawingPage, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingPageId(p.id);
        setEditingName(p.name);
    };

    const commitEditing = () => {
        if (editingPageId) {
            onRenamePage(editingPageId, editingName);
            setEditingPageId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            commitEditing();
        } else if (e.key === 'Escape') {
            setEditingPageId(null);
        }
    };

    return (
        <div className="page-tab-bar">
            {/* Left: Tab list */}
            <div className="page-tabs-scroll-area">
                {pages.map((p) => {
                    const isActive = p.id === activePageId;
                    const isEditing = p.id === editingPageId;

                    return (
                        <div
                            key={p.id}
                            className={`page-tab-item ${isActive ? 'active' : ''}`}
                            onClick={() => onSelectPage(p.id)}
                            onDoubleClick={(e) => startEditing(p, e)}
                            title={`${p.name} (${p.paperSize}サイズ) - ダブルクリックで名前変更`}
                        >
                            <FileText size={14} className="tab-icon" />

                            {isEditing ? (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="tab-name-input"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={commitEditing}
                                    onKeyDown={handleKeyDown}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="tab-title">{p.name}</span>
                            )}

                            {/* Paper Size Tag */}
                            <span className={`tab-paper-tag ${p.paperSize.toLowerCase()}`}>
                                {p.paperSize}
                            </span>

                            {/* Action icons on active/hover tab */}
                            <div className="tab-actions">
                                {!isEditing && (
                                    <button
                                        className="tab-action-btn edit"
                                        onClick={(e) => startEditing(p, e)}
                                        title="名前を変更"
                                    >
                                        <Edit2 size={11} />
                                    </button>
                                )}
                                <button
                                    className="tab-action-btn copy"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDuplicatePage(p.id);
                                    }}
                                    title="このページを複製"
                                >
                                    <Copy size={11} />
                                </button>
                                {pages.length > 1 && (
                                    <button
                                        className="tab-action-btn close"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`「${p.name}」を削除しますか？`)) {
                                                onRemovePage(p.id);
                                            }
                                        }}
                                        title="ページを削除"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Direct 1-Click Add Buttons for A4 and A3 */}
                <div className="add-page-buttons">
                    <button
                        className="add-page-btn a4-btn"
                        onClick={() => onAddPage('A4')}
                        title="新規A4図面ページを作成 (29.7m × 21.0m)"
                    >
                        <Plus size={14} />
                        <span>A4追加</span>
                    </button>
                    <button
                        className="add-page-btn a3-btn"
                        onClick={() => onAddPage('A3')}
                        title="新規A3図面ページを作成 (42.0m × 29.7m)"
                    >
                        <Plus size={14} />
                        <span>A3追加</span>
                    </button>
                </div>
            </div>

            {/* Right: Active Page Paper Size Switcher Toggle */}
            <div className="page-size-controller">
                <span className="paper-label">現在の用紙:</span>
                <div className="paper-toggle-pill">
                    <button
                        className={`size-btn ${currentPaperSize === 'A4' ? 'active' : ''}`}
                        onClick={() => onSelectPaperSize('A4')}
                        title="A4サイズ (29.7m × 21.0m) に切り替え"
                    >
                        {currentPaperSize === 'A4' && <Check size={12} />}
                        <span>A4 横</span>
                    </button>
                    <button
                        className={`size-btn ${currentPaperSize === 'A3' ? 'active' : ''}`}
                        onClick={() => onSelectPaperSize('A3')}
                        title="A3サイズ (42.0m × 29.7m) に切り替え"
                    >
                        {currentPaperSize === 'A3' && <Check size={12} />}
                        <span>A3 横</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
