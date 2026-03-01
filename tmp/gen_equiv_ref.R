# Generate R equivalence reference data for codyna
library(codyna)

# ── Same test data as TS ──────────────────────────────────────────────

df <- data.frame(
  t1 = c("A","B","C","A","B"),
  t2 = c("B","B","A","A","C"),
  t3 = c("A","B","A","A","A"),
  t4 = c("C","A","B","A","B"),
  t5 = c("B","A","B","A","C"),
  t6 = c("A","C","B",NA,"A"),
  t7 = c("C","C","A",NA,"B"),
  t8 = c("B",NA,"A",NA,"C"),
  stringsAsFactors = FALSE
)

# ── sequence_indices ──────────────────────────────────────────────────

cat("=== SEQUENCE INDICES ===\n")
idx <- sequence_indices(df)
write.csv(idx, row.names = FALSE)
cat("\n")

# With favorable
cat("=== SEQUENCE INDICES (favorable=A) ===\n")
idx_fav <- sequence_indices(df, favorable = "A")
write.csv(idx_fav, row.names = FALSE)
cat("\n")

# ── convert ───────────────────────────────────────────────────────────

cat("=== CONVERT FREQUENCY ===\n")
freq <- convert(df, format = "frequency")
print(as.data.frame(freq))
cat("\n")

cat("=== CONVERT ONEHOT ===\n")
oh <- convert(df, format = "onehot")
print(as.data.frame(oh))
cat("\n")

cat("=== CONVERT EDGELIST ===\n")
el <- convert(df, format = "edgelist")
print(as.data.frame(el))
cat("\n")

# ── discover_patterns ─────────────────────────────────────────────────

# 10 seq × 6 TP data for patterns
df2 <- data.frame(
  t1 = c("A","B","A","C","A","B","A","C","B","A"),
  t2 = c("B","A","B","A","A","C","B","C","A","C"),
  t3 = c("A","C","C","B","B","A","A","A","B","B"),
  t4 = c("C","B","A","A","B","B","B","A","A","A"),
  t5 = c("B","A","B","C","C","C","A","B","B","C"),
  t6 = c("A","C","C","B","C","A","B","B","A","B"),
  stringsAsFactors = FALSE
)

cat("=== DISCOVER PATTERNS (ngram, len=2) ===\n")
pat <- discover_patterns(df2, type = "ngram", len = 2, min_freq = 1, min_support = 0)
print(as.data.frame(pat))
cat("\n")

cat("=== DISCOVER PATTERNS (gapped, gap=1) ===\n")
pat_g <- discover_patterns(df2, type = "gapped", gap = 1, min_freq = 1, min_support = 0)
print(as.data.frame(pat_g))
cat("\n")

cat("=== DISCOVER PATTERNS (repeated, len=2) ===\n")
pat_r <- discover_patterns(df2, type = "repeated", len = 2, min_freq = 1, min_support = 0)
print(as.data.frame(pat_r))
cat("\n")

# With group
group <- rep(c("X","Y"), 5)
cat("=== DISCOVER PATTERNS (ngram, len=2, group) ===\n")
pat_grp <- discover_patterns(df2, type = "ngram", len = 2, min_freq = 1, min_support = 0, group = group)
print(as.data.frame(pat_grp))
cat("\n")

# ── JSON output for precise comparison ────────────────────────────────

ref <- list(
  indices = as.data.frame(idx),
  indices_fav = as.data.frame(idx_fav),
  patterns_ngram = as.data.frame(pat),
  patterns_gapped = as.data.frame(pat_g),
  patterns_repeated = as.data.frame(pat_r),
  patterns_group = as.data.frame(pat_grp)
)

jsonlite::write_json(ref, "tmp/equiv_ref.json", pretty = TRUE, digits = 15)
cat("Reference saved to tmp/equiv_ref.json\n")
