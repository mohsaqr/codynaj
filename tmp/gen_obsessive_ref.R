#!/usr/bin/env Rscript
# ══════════════════════════════════════════════════════════════════════
# OBSESSIVE-GRADE R EQUIVALENCE REFERENCE
# Generates precise reference values for every codyna function
# across multiple datasets and edge cases.
# ══════════════════════════════════════════════════════════════════════
library(codyna)

ref <- list()

# ── DATASET 1: Original 5×8 (basic mixed) ─────────────────────────────

d1 <- data.frame(
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

# ── DATASET 2: 20×10 larger dataset ───────────────────────────────────

set.seed(42)
states3 <- c("A","B","C")
d2_mat <- matrix(sample(states3, 200, replace = TRUE), nrow = 20, ncol = 10)
# Inject NAs in specific positions
d2_mat[3, 9:10] <- NA
d2_mat[7, 10] <- NA
d2_mat[12, 8:10] <- NA
d2_mat[15, 10] <- NA  # trailing NA
d2_mat[20, 5:10] <- NA
d2 <- as.data.frame(d2_mat, stringsAsFactors = FALSE)
names(d2) <- paste0("t", 1:10)

# ── DATASET 3: 5-state alphabet, 15×12 ───────────────────────────────

set.seed(123)
states5 <- c("High","Low","Med","Rest","Work")
d3_mat <- matrix(sample(states5, 180, replace = TRUE), nrow = 15, ncol = 12)
d3_mat[2, 11:12] <- NA
d3_mat[8, 12] <- NA
d3_mat[14, 10:12] <- NA
d3 <- as.data.frame(d3_mat, stringsAsFactors = FALSE)
names(d3) <- paste0("t", 1:12)

# ── DATASET 4: 2-state (binary), 10×6 ────────────────────────────────

set.seed(77)
states2 <- c("On","Off")
d4_mat <- matrix(sample(states2, 60, replace = TRUE), nrow = 10, ncol = 6)
d4_mat[5, 6] <- NA
d4_mat[9, 5:6] <- NA
d4 <- as.data.frame(d4_mat, stringsAsFactors = FALSE)
names(d4) <- paste0("t", 1:6)

# ── DATASET 5: Heavy NA, 8×10 ────────────────────────────────────────

set.seed(99)
d5_mat <- matrix(sample(states3, 80, replace = TRUE), nrow = 8, ncol = 10)
d5_mat[1, 7:10] <- NA       # trailing NAs
d5_mat[2, 8:10] <- NA       # trailing NAs
d5_mat[3, c(4,6,8,10)] <- NA  # scattered NAs (never first)
d5_mat[4, 4:7] <- NA        # middle gap
d5_mat[5, c(3,5,7,9)] <- NA # scattered (never first)
d5_mat[6, 9:10] <- NA       # trailing
d5_mat[7, 9:10] <- NA
d5_mat[8, 10] <- NA
d5 <- as.data.frame(d5_mat, stringsAsFactors = FALSE)
names(d5) <- paste0("t", 1:10)

# ── DATASET 6: Emergent state triggers, 6×15 ─────────────────────────

d6 <- data.frame(
  t1  = c("A","A","A","B","C","A"),
  t2  = c("A","A","A","B","C","A"),
  t3  = c("A","A","B","B","C","B"),
  t4  = c("B","A","B","B","A","B"),
  t5  = c("B","B","B","A","A","B"),
  t6  = c("B","B","B","A","A","B"),
  t7  = c("B","B","B","A","A","C"),
  t8  = c("C","B","C","A","B","C"),
  t9  = c("C","C","C","C","B","C"),
  t10 = c("C","C","C","C","B","C"),
  t11 = c("C","C","A","C","B","A"),
  t12 = c("A","C","A","C","A","A"),
  t13 = c("A","A","A","B","A","A"),
  t14 = c("A","A","A","B","A","A"),
  t15 = c("A","A","A","B","C","A"),
  stringsAsFactors = FALSE
)

# ── DATASET 7: Constant sequences, 4×6 ───────────────────────────────

d7 <- data.frame(
  t1 = c("X","Y","Z","X"),
  t2 = c("X","Y","Z","X"),
  t3 = c("X","Y","Z","X"),
  t4 = c("X","Y","Z","X"),
  t5 = c("X","Y","Z","X"),
  t6 = c("X","Y","Z",NA),
  stringsAsFactors = FALSE
)

# ── DATASET 8: Patterns dataset 30×8 (larger for patterns) ───────────

set.seed(2024)
d8_mat <- matrix(sample(c("P","Q","R","S"), 240, replace = TRUE), nrow = 30, ncol = 8)
d8_mat[5, 8] <- NA
d8_mat[15, 7:8] <- NA
d8_mat[25, 8] <- NA
d8 <- as.data.frame(d8_mat, stringsAsFactors = FALSE)
names(d8) <- paste0("t", 1:8)

# ══════════════════════════════════════════════════════════════════════
# 1. SEQUENCE INDICES — all datasets
# ══════════════════════════════════════════════════════════════════════

cat("Generating indices references...\n")

ref$idx_d1 <- as.data.frame(sequence_indices(d1))
ref$idx_d1_favA <- as.data.frame(sequence_indices(d1, favorable = "A"))
ref$idx_d1_favAB <- as.data.frame(sequence_indices(d1, favorable = c("A","B")))
ref$idx_d1_favA_omega2 <- as.data.frame(sequence_indices(d1, favorable = "A", omega = 2.0))
ref$idx_d1_favA_omega05 <- as.data.frame(sequence_indices(d1, favorable = "A", omega = 0.5))

ref$idx_d2 <- as.data.frame(sequence_indices(d2))
ref$idx_d2_favAB <- as.data.frame(sequence_indices(d2, favorable = c("A","B")))

ref$idx_d3 <- as.data.frame(sequence_indices(d3))
ref$idx_d3_favHW <- as.data.frame(sequence_indices(d3, favorable = c("High","Work")))

ref$idx_d4 <- as.data.frame(sequence_indices(d4))

ref$idx_d5 <- as.data.frame(sequence_indices(d5))

ref$idx_d6 <- as.data.frame(sequence_indices(d6))

ref$idx_d7 <- as.data.frame(sequence_indices(d7))

# ══════════════════════════════════════════════════════════════════════
# 2. CONVERT — all formats, multiple datasets
# ══════════════════════════════════════════════════════════════════════

cat("Generating convert references...\n")

# D1
ref$conv_d1_freq <- as.data.frame(convert(d1, format = "frequency"))
ref$conv_d1_onehot <- as.data.frame(convert(d1, format = "onehot"))
ref$conv_d1_edge <- as.data.frame(convert(d1, format = "edgelist"))
ref$conv_d1_rev <- as.data.frame(convert(d1, format = "reverse"))

# D3 (5-state)
ref$conv_d3_freq <- as.data.frame(convert(d3, format = "frequency"))
ref$conv_d3_onehot <- as.data.frame(convert(d3, format = "onehot"))
ref$conv_d3_edge <- as.data.frame(convert(d3, format = "edgelist"))

# D4 (binary)
ref$conv_d4_freq <- as.data.frame(convert(d4, format = "frequency"))
ref$conv_d4_edge <- as.data.frame(convert(d4, format = "edgelist"))

# D7 (constant)
ref$conv_d7_freq <- as.data.frame(convert(d7, format = "frequency"))
ref$conv_d7_edge <- as.data.frame(convert(d7, format = "edgelist"))

# ══════════════════════════════════════════════════════════════════════
# 3. PATTERNS — ngram, gapped, repeated, custom search
# ══════════════════════════════════════════════════════════════════════

cat("Generating pattern references...\n")

# 10×6 original pattern data
pd <- data.frame(
  t1 = c("A","B","A","C","A","B","A","C","B","A"),
  t2 = c("B","A","B","A","A","C","B","C","A","C"),
  t3 = c("A","C","C","B","B","A","A","A","B","B"),
  t4 = c("C","B","A","A","B","B","B","A","A","A"),
  t5 = c("B","A","B","C","C","C","A","B","B","C"),
  t6 = c("A","C","C","B","C","A","B","B","A","B"),
  stringsAsFactors = FALSE
)

# Ngram: len=2
ref$pat_ng2 <- as.data.frame(discover_patterns(pd, type = "ngram", len = 2, min_freq = 1, min_support = 0))
# Ngram: len=3
ref$pat_ng3 <- as.data.frame(discover_patterns(pd, type = "ngram", len = 3, min_freq = 1, min_support = 0))
# Ngram: len=4
ref$pat_ng4 <- as.data.frame(discover_patterns(pd, type = "ngram", len = 4, min_freq = 1, min_support = 0))
# Ngram: len=5
ref$pat_ng5 <- as.data.frame(discover_patterns(pd, type = "ngram", len = 5, min_freq = 1, min_support = 0))
# Ngram: multiple lengths 2:4
ref$pat_ng24 <- as.data.frame(discover_patterns(pd, type = "ngram", len = 2:4, min_freq = 1, min_support = 0))

# Gapped: gap=1
ref$pat_gp1 <- as.data.frame(discover_patterns(pd, type = "gapped", gap = 1, min_freq = 1, min_support = 0))
# Gapped: gap=2
ref$pat_gp2 <- as.data.frame(discover_patterns(pd, type = "gapped", gap = 2, min_freq = 1, min_support = 0))
# Gapped: gap=3
ref$pat_gp3 <- as.data.frame(discover_patterns(pd, type = "gapped", gap = 3, min_freq = 1, min_support = 0))
# Gapped: multiple gaps 1:3
ref$pat_gp13 <- as.data.frame(discover_patterns(pd, type = "gapped", gap = 1:3, min_freq = 1, min_support = 0))

# Repeated: len=2
ref$pat_rp2 <- as.data.frame(discover_patterns(pd, type = "repeated", len = 2, min_freq = 1, min_support = 0))
# Repeated: len=3
ref$pat_rp3 <- as.data.frame(discover_patterns(pd, type = "repeated", len = 3, min_freq = 1, min_support = 0))
# Repeated: len=2:4
ref$pat_rp24 <- as.data.frame(discover_patterns(pd, type = "repeated", len = 2:4, min_freq = 1, min_support = 0))

# Custom pattern search
ref$pat_custom_AB <- as.data.frame(discover_patterns(pd, pattern = "A->B", min_freq = 1, min_support = 0))
ref$pat_custom_AwB <- as.data.frame(discover_patterns(pd, pattern = "A->*->B", min_freq = 1, min_support = 0))
ref$pat_custom_AwwC <- as.data.frame(discover_patterns(pd, pattern = "A->*->*->C", min_freq = 1, min_support = 0))
ref$pat_custom_BwA <- as.data.frame(discover_patterns(pd, pattern = "B->*->A", min_freq = 1, min_support = 0))

# Filtering
ref$pat_start_A <- as.data.frame(discover_patterns(pd, type = "ngram", len = 2, min_freq = 1, min_support = 0, start = "A"))
ref$pat_end_C <- as.data.frame(discover_patterns(pd, type = "ngram", len = 2, min_freq = 1, min_support = 0, end = "C"))
ref$pat_contain_B <- as.data.frame(discover_patterns(pd, type = "ngram", len = 2, min_freq = 1, min_support = 0, contain = "B"))
ref$pat_minfreq5 <- as.data.frame(discover_patterns(pd, type = "ngram", len = 2, min_freq = 5, min_support = 0))
ref$pat_minsup03 <- as.data.frame(discover_patterns(pd, type = "ngram", len = 2, min_freq = 1, min_support = 0.3))

# Larger dataset patterns (d8: 30×8, 4 states)
ref$pat_d8_ng2 <- as.data.frame(discover_patterns(d8, type = "ngram", len = 2, min_freq = 1, min_support = 0))
ref$pat_d8_ng3 <- as.data.frame(discover_patterns(d8, type = "ngram", len = 3, min_freq = 1, min_support = 0))
ref$pat_d8_gp1 <- as.data.frame(discover_patterns(d8, type = "gapped", gap = 1, min_freq = 1, min_support = 0))
ref$pat_d8_rp2 <- as.data.frame(discover_patterns(d8, type = "repeated", len = 2, min_freq = 1, min_support = 0))

# ── Patterns on every other dataset ───────────────────────────────────

# D1 (5×8, 3 states, NAs)
ref$pat_d1_ng2 <- as.data.frame(discover_patterns(d1, type = "ngram", len = 2, min_freq = 1, min_support = 0))
ref$pat_d1_ng3 <- as.data.frame(discover_patterns(d1, type = "ngram", len = 3, min_freq = 1, min_support = 0))
ref$pat_d1_ng25 <- as.data.frame(discover_patterns(d1, type = "ngram", len = 2:5, min_freq = 1, min_support = 0))
ref$pat_d1_gp1 <- as.data.frame(discover_patterns(d1, type = "gapped", gap = 1, min_freq = 1, min_support = 0))
ref$pat_d1_gp13 <- as.data.frame(discover_patterns(d1, type = "gapped", gap = 1:3, min_freq = 1, min_support = 0))
ref$pat_d1_rp2 <- as.data.frame(discover_patterns(d1, type = "repeated", len = 2, min_freq = 1, min_support = 0))
ref$pat_d1_rp24 <- as.data.frame(discover_patterns(d1, type = "repeated", len = 2:4, min_freq = 1, min_support = 0))

# D2 (20×10, 3 states, NAs)
ref$pat_d2_ng2 <- as.data.frame(discover_patterns(d2, type = "ngram", len = 2, min_freq = 1, min_support = 0))
ref$pat_d2_ng3 <- as.data.frame(discover_patterns(d2, type = "ngram", len = 3, min_freq = 1, min_support = 0))
ref$pat_d2_ng4 <- as.data.frame(discover_patterns(d2, type = "ngram", len = 4, min_freq = 1, min_support = 0))
ref$pat_d2_gp12 <- as.data.frame(discover_patterns(d2, type = "gapped", gap = 1:2, min_freq = 1, min_support = 0))
ref$pat_d2_rp23 <- as.data.frame(discover_patterns(d2, type = "repeated", len = 2:3, min_freq = 1, min_support = 0))

# D3 (15×12, 5 states)
ref$pat_d3_ng2 <- as.data.frame(discover_patterns(d3, type = "ngram", len = 2, min_freq = 1, min_support = 0))
ref$pat_d3_ng3 <- as.data.frame(discover_patterns(d3, type = "ngram", len = 3, min_freq = 1, min_support = 0))
ref$pat_d3_ng4 <- as.data.frame(discover_patterns(d3, type = "ngram", len = 4, min_freq = 1, min_support = 0))
ref$pat_d3_gp12 <- as.data.frame(discover_patterns(d3, type = "gapped", gap = 1:2, min_freq = 1, min_support = 0))
ref$pat_d3_rp23 <- as.data.frame(discover_patterns(d3, type = "repeated", len = 2:3, min_freq = 1, min_support = 0))

# D4 (10×6, 2 states)
ref$pat_d4_ng2 <- as.data.frame(discover_patterns(d4, type = "ngram", len = 2, min_freq = 1, min_support = 0))
ref$pat_d4_ng3 <- as.data.frame(discover_patterns(d4, type = "ngram", len = 3, min_freq = 1, min_support = 0))
ref$pat_d4_ng4 <- as.data.frame(discover_patterns(d4, type = "ngram", len = 4, min_freq = 1, min_support = 0))
ref$pat_d4_gp12 <- as.data.frame(discover_patterns(d4, type = "gapped", gap = 1:2, min_freq = 1, min_support = 0))
ref$pat_d4_rp24 <- as.data.frame(discover_patterns(d4, type = "repeated", len = 2:4, min_freq = 1, min_support = 0))

# D5 (8×10, heavy NAs)
ref$pat_d5_ng2 <- as.data.frame(discover_patterns(d5, type = "ngram", len = 2, min_freq = 1, min_support = 0))
ref$pat_d5_ng3 <- as.data.frame(discover_patterns(d5, type = "ngram", len = 3, min_freq = 1, min_support = 0))
ref$pat_d5_gp1 <- as.data.frame(discover_patterns(d5, type = "gapped", gap = 1, min_freq = 1, min_support = 0))
ref$pat_d5_rp2 <- as.data.frame(discover_patterns(d5, type = "repeated", len = 2, min_freq = 1, min_support = 0))

# D6 (6×15, emergent-triggering)
ref$pat_d6_ng2 <- as.data.frame(discover_patterns(d6, type = "ngram", len = 2, min_freq = 1, min_support = 0))
ref$pat_d6_ng3 <- as.data.frame(discover_patterns(d6, type = "ngram", len = 3, min_freq = 1, min_support = 0))
ref$pat_d6_ng5 <- as.data.frame(discover_patterns(d6, type = "ngram", len = 5, min_freq = 1, min_support = 0))
ref$pat_d6_gp13 <- as.data.frame(discover_patterns(d6, type = "gapped", gap = 1:3, min_freq = 1, min_support = 0))
ref$pat_d6_rp25 <- as.data.frame(discover_patterns(d6, type = "repeated", len = 2:5, min_freq = 1, min_support = 0))

# D7 (4×6, constant sequences)
ref$pat_d7_ng2 <- as.data.frame(discover_patterns(d7, type = "ngram", len = 2, min_freq = 1, min_support = 0))
ref$pat_d7_rp26 <- as.data.frame(discover_patterns(d7, type = "repeated", len = 2:6, min_freq = 1, min_support = 0))

# ── More custom pattern searches ──────────────────────────────────────

# On pd
ref$pat_custom_CwwwA <- as.data.frame(discover_patterns(pd, pattern = "C->*->*->*->A", min_freq = 1, min_support = 0))
ref$pat_custom_AwBwC <- as.data.frame(discover_patterns(pd, pattern = "A->*->B->*->C", min_freq = 1, min_support = 0))

# On d6 (longer sequences, more wildcard positions)
ref$pat_d6_custom_AwA <- as.data.frame(discover_patterns(d6, pattern = "A->*->A", min_freq = 1, min_support = 0))
ref$pat_d6_custom_BwwB <- as.data.frame(discover_patterns(d6, pattern = "B->*->*->B", min_freq = 1, min_support = 0))
ref$pat_d6_custom_AwwwC <- as.data.frame(discover_patterns(d6, pattern = "A->*->*->*->C", min_freq = 1, min_support = 0))
ref$pat_d6_custom_CwwA <- as.data.frame(discover_patterns(d6, pattern = "C->*->*->A", min_freq = 1, min_support = 0))

# On d3 (5-state)
ref$pat_d3_custom_HwW <- as.data.frame(discover_patterns(d3, pattern = "High->*->Work", min_freq = 1, min_support = 0))
ref$pat_d3_custom_LwwH <- as.data.frame(discover_patterns(d3, pattern = "Low->*->*->High", min_freq = 1, min_support = 0))

# On d4 (binary)
ref$pat_d4_custom_OnwOff <- as.data.frame(discover_patterns(d4, pattern = "On->*->Off", min_freq = 1, min_support = 0))

# ── Combined filters ──────────────────────────────────────────────────

ref$pat_startA_endC <- as.data.frame(discover_patterns(pd, type = "ngram", len = 3, min_freq = 1, min_support = 0, start = "A", end = "C"))
ref$pat_containAB <- as.data.frame(discover_patterns(pd, type = "ngram", len = 3, min_freq = 1, min_support = 0, contain = c("A", "B")))
ref$pat_startB_containC <- as.data.frame(discover_patterns(pd, type = "ngram", len = 3, min_freq = 1, min_support = 0, start = "B", contain = "C"))
ref$pat_d3_startHigh <- as.data.frame(discover_patterns(d3, type = "ngram", len = 2, min_freq = 1, min_support = 0, start = "High"))
ref$pat_d3_endWork <- as.data.frame(discover_patterns(d3, type = "ngram", len = 2, min_freq = 1, min_support = 0, end = "Work"))
ref$pat_d8_startP_endS <- as.data.frame(discover_patterns(d8, type = "ngram", len = 3, min_freq = 1, min_support = 0, start = "P", end = "S"))
ref$pat_d8_mf3_ms01 <- as.data.frame(discover_patterns(d8, type = "ngram", len = 2, min_freq = 3, min_support = 0.1))

# ── Grouped patterns on more datasets ─────────────────────────────────

# D1 grouped (5 rows)
grp_d1 <- c("G1","G2","G1","G2","G1")
ref$pat_grp_d1 <- as.data.frame(discover_patterns(d1, type = "ngram", len = 2, min_freq = 1, min_support = 0, group = grp_d1))

# D2 grouped (20 rows)
grp_d2 <- rep(c("Alpha","Beta"), 10)
ref$pat_grp_d2 <- as.data.frame(discover_patterns(d2, type = "ngram", len = 2, min_freq = 1, min_support = 0, group = grp_d2))

# D3 grouped (15 rows, 3 groups)
grp_d3 <- rep(c("X","Y","Z"), 5)
ref$pat_grp_d3 <- as.data.frame(discover_patterns(d3, type = "ngram", len = 2, min_freq = 1, min_support = 0, group = grp_d3))

# D6 grouped (6 rows)
grp_d6 <- c("A","B","A","B","A","B")
ref$pat_grp_d6 <- as.data.frame(discover_patterns(d6, type = "ngram", len = 2, min_freq = 1, min_support = 0, group = grp_d6))

# D8 grouped with gapped (grp3 defined below in grouped section)
grp3_early <- rep(c("Lo","Mi","Hi"), 10)
ref$pat_grp_d8_gp1 <- as.data.frame(discover_patterns(d8, type = "gapped", gap = 1, min_freq = 1, min_support = 0, group = grp3_early))

# D4 grouped
grp_d4 <- rep(c("Hi","Lo"), 5)
ref$pat_grp_d4 <- as.data.frame(discover_patterns(d4, type = "ngram", len = 2:3, min_freq = 1, min_support = 0, group = grp_d4))

# ══════════════════════════════════════════════════════════════════════
# 4. PATTERNS WITH GROUPING — chi-squared
# ══════════════════════════════════════════════════════════════════════

cat("Generating grouped pattern references...\n")

# 2-group
grp2 <- rep(c("X","Y"), 5)
ref$pat_grp2_ng2 <- as.data.frame(discover_patterns(pd, type = "ngram", len = 2, min_freq = 1, min_support = 0, group = grp2))

# 3-group on d8
grp3 <- rep(c("Lo","Mi","Hi"), 10)
ref$pat_grp3_d8 <- as.data.frame(discover_patterns(d8, type = "ngram", len = 2, min_freq = 1, min_support = 0, group = grp3))

# Unbalanced groups
grp_unbal <- c(rep("Major", 7), rep("Minor", 3))
ref$pat_grpU_ng2 <- as.data.frame(discover_patterns(pd, type = "ngram", len = 2, min_freq = 1, min_support = 0, group = grp_unbal))

# ══════════════════════════════════════════════════════════════════════
# 5. OUTCOME ANALYSIS — logistic regression
# ══════════════════════════════════════════════════════════════════════

cat("Generating outcome references...\n")

# 20×5 data with binary outcome
od <- data.frame(
  t1 = c("A","B","A","C","A","B","A","C","B","A","B","A","C","B","A","C","B","A","C","B"),
  t2 = c("B","A","B","A","A","C","B","C","A","C","B","C","B","A","B","A","C","A","B","A"),
  t3 = c("A","C","C","B","B","A","A","A","B","B","A","A","A","A","C","B","C","B","A","C"),
  t4 = c("C","B","A","A","B","B","B","A","A","A","C","B","A","C","B","C","A","C","B","A"),
  t5 = c("B","A","B","C","C","C","A","B","B","C","A","B","C","B","A","A","B","C","C","B"),
  stringsAsFactors = FALSE
)
outcome <- c("Pass","Fail","Pass","Fail","Pass","Fail","Pass","Fail","Pass","Fail",
             "Pass","Pass","Fail","Fail","Pass","Fail","Pass","Pass","Fail","Fail")

# Fit the R model for comparison
tryCatch({
  fit <- analyze_outcome(od, outcome = outcome, n = 5, freq = FALSE,
                         type = "ngram", len = 1:2, gap = 1,
                         min_freq = 2, min_support = 0.01)
  coefs <- summary(fit)$coefficients
  ref$outcome <- list(
    coef_names = rownames(coefs),
    estimates = coefs[, "Estimate"],
    se = coefs[, "Std. Error"],
    z = coefs[, "z value"],
    p = coefs[, "Pr(>|z|)"],
    aic = AIC(fit),
    bic = BIC(fit),
    n = nobs(fit)
  )
}, error = function(e) {
  cat("  outcome model failed:", e$message, "\n")
  ref$outcome <<- NULL
})

# ══════════════════════════════════════════════════════════════════════
# 6. PREPARE / RLE — internal function checks
# ══════════════════════════════════════════════════════════════════════

cat("Generating prepare references...\n")

# Test rle on known sequences (R's rle matches our custom rle except for NA handling)
rle1 <- rle(c(1L, 1L, 2L, 2L, 2L, 3L, 1L))
ref$rle1 <- list(values = rle1$values, lengths = rle1$lengths)

rle2 <- rle(c(1L, NA, NA, 2L))
ref$rle2 <- list(values = rle2$values, lengths = rle2$lengths)

rle3 <- rle(c(3L, 3L, 3L, 3L))
ref$rle3 <- list(values = rle3$values, lengths = rle3$lengths)

# ══════════════════════════════════════════════════════════════════════
# Store all raw datasets for the TS runner to reconstruct
# ══════════════════════════════════════════════════════════════════════

ref$datasets <- list(
  d1 = as.list(d1),
  d2 = as.list(d2),
  d3 = as.list(d3),
  d4 = as.list(d4),
  d5 = as.list(d5),
  d6 = as.list(d6),
  d7 = as.list(d7),
  d8 = as.list(d8),
  pd = as.list(pd),
  od = as.list(od)
)

ref$groups <- list(
  grp2 = grp2,
  grp3 = grp3,
  grp_unbal = grp_unbal,
  outcome = outcome,
  grp_d1 = grp_d1,
  grp_d2 = grp_d2,
  grp_d3 = grp_d3,
  grp_d6 = grp_d6,
  grp_d4 = grp_d4
)

# ══════════════════════════════════════════════════════════════════════
# Write JSON
# ══════════════════════════════════════════════════════════════════════

jsonlite::write_json(ref, "tmp/obsessive_ref.json", pretty = TRUE, digits = 15, na = "null")
cat("Reference saved to tmp/obsessive_ref.json\n")

# Count total checks
total <- 0
for (nm in names(ref)) {
  if (nm %in% c("datasets", "groups")) next
  obj <- ref[[nm]]
  if (is.data.frame(obj)) {
    total <- total + nrow(obj) * ncol(obj)
  } else if (is.list(obj)) {
    total <- total + sum(vapply(obj, length, integer(1L)))
  }
}
cat(sprintf("Total reference values: %d\n", total))
