# Office import regression fixtures

## Source of truth

The existing `question-import-template.docx` and `.xlsx` are unchanged copies of the frontend's published templates at `/templates/question-import-template.docx` and `/templates/question-import-template.xlsx`. Both URLs were downloaded from the running application and their SHA-256 hashes matched the frontend assets and these backend fixtures:

- DOCX: `e85883868279a1ee228fb21d841d8ea556d1087e56474b052783f368adb509db`
- XLSX: `1daf32b5eeb71ccade66a2ffc6fe4135a034f276b6166ee7750f63ac4261c8cb`

`import-expected.json` is authored independently of the parsers. The fixture builder fills copies of the official templates from these input definitions; it never invokes a parser or records parser output as expected data. Existing official fixtures must not be overwritten by the builder.

```powershell
node src\question-imports\parsers\fixtures\generate-import-fixtures.cjs
npx jest --runInBand src\question-imports\parsers
```

## Matrix (DOCX and XLSX variants unless specified; 31 generated files)

| Fixture | Input records | Expected extraction / validation |
| --- | ---: | --- |
| mixed | 3 | Exact SINGLE_CHOICE, MULTIPLE_CHOICE, ESSAY content; Vietnamese, Unicode, LaTeX, paragraphs, non-contiguous option keys, one image |
| single | 1 | Exact first input question |
| long-rich | 3 | First question adds 250 copies of the documented Vietnamese test sentence; bold/italic option text becomes plain text, never lost |
| blank-row | 3 | Blank Excel row / Word paragraph ignored; physical Excel source indices remain 2, 4, 5 |
| duplicate-questions | 4 | Repeated essay remains visible; deduplication belongs to the commit policy, not extraction |
| multiple-images | 3 | Two identical embedded images on the first question, in order 0 then 1 |
| unknown-answer | 3 | First row blocked: `C,Z` contains unknown option Z; valid rows unchanged |
| missing-answer-option | 3 | First row blocked: `A,B` selects an empty option B; do not silently accept only A |
| no-answer | 3 | First row has zero correct options and must fail service validation |
| invalid-type | 3 | First row retains unsupported TRUE_FALSE for service validation; never coerce silently into a valid row |
| incomplete-row | 4 | Fourth record has only a code; retain it for review as invalid |
| missing-header | 3 | Reject malformed template instead of dropping a question or inventing a field |
| missing-code (DOCX only) | 3 | Reject a question table missing its first code field; never silently import only the remaining two tables |
| duplicate-field | 3 | Reject ambiguous header / Word field before it overwrites an answer |
| empty | 0 | Parser returns no questions; processing must fail before bank writes |
| corrupt | 0 | Reject non-Office bytes despite a valid-looking filename |

The parser's documented normalization is outer whitespace trimming, uppercase enum/key labels and plain-text rich text. Internal line boundaries, option order and correct flags must survive. The parser preserves image bytes; the processing service intentionally normalizes images to bounded PNGs.

## Supported scope

The published format supports SINGLE_CHOICE, MULTIPLE_CHOICE and ESSAY; KNOWLEDGE, UNDERSTANDING, APPLYING and ADVANCED; A-F options; chapter paths (and legacy chapter_id), an essay model answer and embedded question images. It does not define question scores, separate explanations, exam metadata/sections, true/false or short-answer types, arbitrary prose Word exams, merged-cell layouts or formula recalculation. Tests must not invent support for those formats.

There is no standalone Excel/Word exam-import template or frontend exam-import flow. The backend optionally attaches imported questions to an existing MANUAL exam through `exam_id`; this is distinct from importing an exam definition.

These binary files are test inputs, including deliberately invalid files, not replacement user templates. LibreOffice/Word rendering is not a prerequisite for parser tests; visual Office rendering was unavailable in this environment and is not claimed as verified.
