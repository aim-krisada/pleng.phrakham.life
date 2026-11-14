// Read EVERY row of a list query, page by page.
//
// WHY: the Supabase API hands back at most 1000 rows per request (the project's "max rows"
// setting) and says nothing when it cuts. The public sees only checked songs (987 on
// 14 พ.ย. 2569), so the cut never showed. A signed-in team member also sees the unchecked
// ones, which took the list past 1000 — and because the list is ordered by number with the
// blank-number songs LAST, exactly those songs fell off: พี่เปา's อนุชน book showed 143 of 147
// and search could not find "แน่ะ เราเป็นคน" (14 พ.ย. 2569).
//
// `makeQuery` must return a FRESH query builder each call (a builder can only run once).
// The query should carry a total order (e.g. number, then id), or pages can overlap or skip.
export const PAGE_SIZE = 1000

export async function fetchAllRows(makeQuery, pageSize = PAGE_SIZE) {
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1)
    // Any failed page voids the whole read: a half list must never be shown or saved offline.
    if (error) return { data: null, error }
    const page = data || []
    rows.push(...page)
    if (page.length < pageSize) return { data: rows, error: null }
  }
}
