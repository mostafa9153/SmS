const fs = require('fs');
const file = 'components/results/evaluation-register-printable.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add getSubjectSplitScores function
if (!content.includes('function getSubjectSplitScores')) {
  content = content.replace(
    'export const EvaluationRegisterPrintable:',
    `function getSubjectSplitScores(result: StudentResult, subjectName: string): { wScore: string; pScore: string } {
  if (!result.subjectMarks) return { wScore: "", pScore: "" };

  let rawVal: any = undefined;
  for (const [k, v] of Object.entries(result.subjectMarks)) {
    if (
      normalizeSubjectName(k) === normalizeSubjectName(subjectName) ||
      k.toLowerCase().trim() === subjectName.toLowerCase().trim()
    ) {
      rawVal = v;
      break;
    }
  }

  if (rawVal === undefined || rawVal === null) return { wScore: "", pScore: "" };

  if (typeof rawVal === "object") {
    if (rawVal.isAbsent) return { wScore: "AB", pScore: "AB" };
    
    let wScore = "";
    let pScore = "";
    if (rawVal.written !== undefined && rawVal.written !== null && rawVal.written !== "") wScore = String(rawVal.written);
    else if (rawVal.theory !== undefined && rawVal.theory !== null && rawVal.theory !== "") wScore = String(rawVal.theory);
    
    if (rawVal.practical !== undefined && rawVal.practical !== null && rawVal.practical !== "") pScore = String(rawVal.practical);
    else if (rawVal.project !== undefined && rawVal.project !== null && rawVal.project !== "") pScore = String(rawVal.project);
    
    return { wScore, pScore };
  }

  return { wScore: "", pScore: "" };
}

export const EvaluationRegisterPrintable:`
  );
}

// Replace chunks exactly by string matching!
const originalColgroup = \`{cleanSubjects.map((_, sIdx) => (
                        <col
                          key={\\\`col-sub-\\\${sIdx}\\\`}
                          style={{ width: \\\`\\\${54 / cleanSubjects.length}%\\\` }}
                        />
                      ))}\`;

const newColgroup = \`{cleanSubjects.map((sub, sIdx) => {
                        const subInfo = getSubjectFullMarks(selectedClass, selectedExam, sub);
                        const isSplit = subInfo.hasPractical && subInfo.practicalFull > 0;
                        if (isSplit) {
                          return (
                            <React.Fragment key={\\\`col-sub-\\\${sIdx}\\\`}>
                              <col style={{ width: \\\`\\\${(54 / cleanSubjects.length) / 2}%\\\` }} />
                              <col style={{ width: \\\`\\\${(54 / cleanSubjects.length) / 2}%\\\` }} />
                            </React.Fragment>
                          );
                        }
                        return (
                          <col
                            key={\\\`col-sub-\\\${sIdx}\\\`}
                            style={{ width: \\\`\\\${54 / cleanSubjects.length}%\\\` }}
                          />
                        );
                      })}\`;

content = content.replace(originalColgroup, newColgroup);

const originalSubHeader = \`{cleanSubjects.map((sub, sIdx) => (
                          <th
                            key={\\\`sub-header-\\\${sIdx}\\\`}
                            className="border border-black text-center text-[7px] font-extrabold uppercase px-0.5 py-0.5 leading-tight overflow-hidden break-words"
                          >
                            <span className="block line-clamp-2">
                              {sub.replace(/\\(.*?\\)/g, "").trim().toUpperCase()}
                            </span>
                          </th>
                        ))}\`;

const newSubHeader = \`{cleanSubjects.map((sub, sIdx) => {
                          const subInfo = getSubjectFullMarks(selectedClass, selectedExam, sub);
                          const isSplit = subInfo.hasPractical && subInfo.practicalFull > 0;
                          return (
                            <th
                              key={\\\`sub-header-\\\${sIdx}\\\`}
                              colSpan={isSplit ? 2 : 1}
                              className="border border-black text-center text-[7px] font-extrabold uppercase px-0.5 py-0.5 leading-tight overflow-hidden break-words"
                            >
                              <span className="block line-clamp-2">
                                {sub.replace(/\\(.*?\\)/g, "").trim().toUpperCase()}
                              </span>
                            </th>
                          );
                        })}\`;
                        
content = content.replace(originalSubHeader, newSubHeader);

const originalSubMarksRow = \`{cleanSubjects.map((sub, sIdx) => {
                          const subInfo = getSubjectFullMarks(selectedClass, selectedExam, sub);
                          const subMarks = subInfo.totalFull > 0 ? String(subInfo.totalFull) : defaultFullMarks;
                          return (
                            <th
                              key={\\\`sub-sub-\\\${sIdx}\\\`}
                              className="border border-black text-center py-0.5 font-mono font-bold text-[8px] text-black"
                            >
                              {subMarks}
                            </th>
                          );
                        })}\`;
                        
const newSubMarksRow = \`{cleanSubjects.map((sub, sIdx) => {
                          const subInfo = getSubjectFullMarks(selectedClass, selectedExam, sub);
                          const isSplit = subInfo.hasPractical && subInfo.practicalFull > 0;
                          if (isSplit) {
                            return (
                              <React.Fragment key={\\\`sub-sub-\\\${sIdx}\\\`}>
                                <th className="border border-black text-center py-0.5 font-mono font-bold text-[7px] text-black">
                                  W:{subInfo.writtenFull}
                                </th>
                                <th className="border border-black text-center py-0.5 font-mono font-bold text-[7px] text-black">
                                  P:{subInfo.practicalFull}
                                </th>
                              </React.Fragment>
                            );
                          }
                          const subMarks = subInfo.totalFull > 0 ? String(subInfo.totalFull) : defaultFullMarks;
                          return (
                            <th
                              key={\\\`sub-sub-\\\${sIdx}\\\`}
                              className="border border-black text-center py-0.5 font-mono font-bold text-[8px] text-black"
                            >
                              {subMarks}
                            </th>
                          );
                        })}\`;
                        
content = content.replace(originalSubMarksRow, newSubMarksRow);

const originalColSpan = \`colSpan={3 + cleanSubjects.length}\`;
const newColSpan = \`colSpan={3 + cleanSubjects.reduce((acc, sub) => {
                            const info = getSubjectFullMarks(selectedClass, selectedExam, sub);
                            return acc + (info.hasPractical && info.practicalFull > 0 ? 2 : 1);
                          }, 0)}\`;
                          
content = content.replace(originalColSpan, newColSpan);

const originalScoreVal = \`{cleanSubjects.map((sub, sIdx) => {
                              const scoreVal = printMode === "with_marks" ? getSubjectScore(st, sub) : "";
                              return (
                                <td
                                  key={\\\`score-\\\${sIdx}\\\`}
                                  className="border border-black text-center font-mono font-bold text-[9px] px-1"
                                >
                                  {scoreVal}
                                </td>
                              );
                            })}\`;
                            
const newScoreVal = \`{cleanSubjects.map((sub, sIdx) => {
                              const subInfo = getSubjectFullMarks(selectedClass, selectedExam, sub);
                              const isSplit = subInfo.hasPractical && subInfo.practicalFull > 0;
                              if (isSplit) {
                                const { wScore, pScore } = printMode === "with_marks" ? getSubjectSplitScores(st, sub) : { wScore: "", pScore: "" };
                                return (
                                  <React.Fragment key={\\\`score-\\\${sIdx}\\\`}>
                                    <td className="border border-black text-center font-mono font-bold text-[9px] px-0.5">
                                      {wScore}
                                    </td>
                                    <td className="border border-black text-center font-mono font-bold text-[9px] px-0.5">
                                      {pScore}
                                    </td>
                                  </React.Fragment>
                                );
                              }
                              const scoreVal = printMode === "with_marks" ? getSubjectScore(st, sub) : "";
                              return (
                                <td
                                  key={\\\`score-\\\${sIdx}\\\`}
                                  className="border border-black text-center font-mono font-bold text-[9px] px-1"
                                >
                                  {scoreVal}
                                </td>
                              );
                            })}\`;
                            
content = content.replace(originalScoreVal, newScoreVal);


const originalEmptyPad = \`{cleanSubjects.map((_, sIdx) => (
                            <td key={\\\`pad-sub-\\\${sIdx}\\\`} className="border border-black">&nbsp;</td>
                          ))}\`;
                          
const newEmptyPad = \`{cleanSubjects.map((sub, sIdx) => {
                            const subInfo = getSubjectFullMarks(selectedClass, selectedExam, sub);
                            const isSplit = subInfo.hasPractical && subInfo.practicalFull > 0;
                            if (isSplit) {
                              return (
                                <React.Fragment key={\\\`pad-sub-\\\${sIdx}\\\`}>
                                  <td className="border border-black">&nbsp;</td>
                                  <td className="border border-black">&nbsp;</td>
                                </React.Fragment>
                              );
                            }
                            return <td key={\\\`pad-sub-\\\${sIdx}\\\`} className="border border-black">&nbsp;</td>;
                          })}\`;
                          
content = content.replace(originalEmptyPad, newEmptyPad);

fs.writeFileSync(file, content);
console.log("File patched successfully safely!");
