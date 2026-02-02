export interface Occurrence {
    variable: string;
    line: number;
    snippet: string;
}

export const scanContent = (text: string, filterDigit?: string): Occurrence[] => {
    const lines = text.split(/\r?\n/);
    let occurrences: Occurrence[] = [];

    // Filter handling: Prepare filter value (strip # if present)
    const normalizedFilter = filterDigit ? filterDigit.replace('#', '') : undefined;

    lines.forEach((lineContent, index) => {
        let match;
        // Create a new regex for each line to strictly match within that line
        const lineRegex = /#(\d{3})\b/g;

        while ((match = lineRegex.exec(lineContent)) !== null) {
            const fullMatch = match[0];
            const numberStr = match[1];

            if (normalizedFilter) {
                if (numberStr.startsWith(normalizedFilter)) {
                    occurrences.push({
                        variable: fullMatch,
                        line: index + 1,
                        snippet: lineContent.trim()
                    });
                }
            } else {
                occurrences.push({
                    variable: fullMatch,
                    line: index + 1,
                    snippet: lineContent.trim()
                });
            }
        }
    });

    return occurrences;
};
