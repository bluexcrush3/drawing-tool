import type { DrawingProject } from '../types/drawing';
import { downloadText } from './imageExporter';

export function saveProjectToFile(project: DrawingProject, filename?: string) {
    const json = JSON.stringify(project, null, 2);
    const name = filename || `${project.title || '間取り図面'}_${new Date().toISOString().slice(0, 10)}.madori`;
    downloadText(json, name, 'application/json');
}

export function loadProjectFromFile(file: File): Promise<DrawingProject> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const project = JSON.parse(text) as DrawingProject;
                resolve(project);
            } catch {
                reject(new Error('プロジェクトファイルの解析に失敗しました'));
            }
        };
        reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
        reader.readAsText(file);
    });
}
