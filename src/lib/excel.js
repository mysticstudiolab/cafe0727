import * as XLSX from 'xlsx'

// PRD.md F1 — 첫 줄이 헤더(이름/주소/카테고리)인 카페 목록 엑셀을 파싱한다.
const REQUIRED_HEADERS = ['이름', '주소', '카테고리']

export async function parseCafeExcelFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const table = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (table.length === 0) {
    throw new Error('엑셀 파일에 데이터가 없습니다.')
  }

  const headerRow = table[0].map((cell) => String(cell).trim())
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerRow.includes(header))
  if (missingHeaders.length > 0) {
    throw new Error(
      `엑셀 첫 줄에 "${missingHeaders.join(', ')}" 컬럼이 없습니다. 첫 줄이 이름/주소/카테고리인지 확인해주세요.`,
    )
  }

  const nameIndex = headerRow.indexOf('이름')
  const addressIndex = headerRow.indexOf('주소')
  const categoryIndex = headerRow.indexOf('카테고리')

  return table
    .slice(1)
    .map((row) => ({
      name: String(row[nameIndex] ?? '').trim(),
      address: String(row[addressIndex] ?? '').trim(),
      category: String(row[categoryIndex] ?? '').trim(),
    }))
    .filter((row) => row.name && row.address)
}
