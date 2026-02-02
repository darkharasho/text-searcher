// import mammoth from 'mammoth';

export async function extractTextFromFile(file: File): Promise<string> {
    const name = file.name.toLowerCase();

    // 1. Text-based files
    if (
        name.endsWith('.txt') ||
        name.endsWith('.md') ||
        name.endsWith('.json') ||
        name.endsWith('.js') ||
        name.endsWith('.ts') ||
        name.endsWith('.tsx') ||
        name.endsWith('.jsx') ||
        name.endsWith('.html') ||
        name.endsWith('.css') ||
        name.endsWith('.xml') ||
        name.endsWith('.log') ||
        name.endsWith('.rtf') || // Basic RTF reading (raw text)
        // CNC / Machine files
        name.endsWith('.eia') ||
        name.endsWith('.nc') ||
        name.endsWith('.ptp') ||
        file.type.startsWith('text/')
    ) {
        return await file.text();
    }

    // 2. DOCX
    // if (name.endsWith('.docx')) {
    //     try {
    //         const arrayBuffer = await file.arrayBuffer();
    //         const result = await mammoth.extractRawText({ arrayBuffer });
    //         return result.value;
    //     } catch (e) {
    //         console.error("Error reading DOCX:", e);
    //         return ""; // Skip invalid docx
    //     }
    // }

    // 3. Other binary formats (doc, pdf) are harder in pure JS/Electron without heavy libs.
    // We skip them for now or just return empty string.
    return "";
}

export function isSupportedFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return (
        name.endsWith('.txt') ||
        name.endsWith('.md') ||
        name.endsWith('.json') ||
        name.endsWith('.js') ||
        name.endsWith('.ts') ||
        name.endsWith('.tsx') ||
        name.endsWith('.jsx') ||
        name.endsWith('.html') ||
        name.endsWith('.css') ||
        name.endsWith('.xml') ||
        name.endsWith('.log') ||
        name.endsWith('.rtf') ||
        name.endsWith('.docx') ||
        name.endsWith('.eia') ||
        name.endsWith('.nc') ||
        name.endsWith('.ptp') ||
        file.type.startsWith('text/')
    );
}
