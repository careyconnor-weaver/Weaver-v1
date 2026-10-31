# What gets replies? A logistic regression on Weaver outreach data.
# ------------------------------------------------------------------
# Input : outreach_outcomes.csv, exported by analytics/python/weekly_report.py --csv-dir
#         (one row per email sent; replied = TRUE if the contact replied within 14 days)
# Output: printed results, reply_rates.png, and reply_analysis.md next to the input file.
#
# Run:    Rscript analytics/R/reply_analysis.R path/to/outreach_outcomes.csv
#
# Base R only (no packages to install). Questions it answers:
#   1. How does the reply rate change from the first email to each follow-up?
#   2. Do weekday emails get more replies than weekend emails?
#   3. Controlling for both, how much does an earlier conversation help?
# Small samples give wide confidence intervals; the script says so instead of
# over-reading the numbers.

args <- commandArgs(trailingOnly = TRUE)
path <- if (length(args) >= 1) args[1] else "outreach_outcomes.csv"
if (!file.exists(path)) stop("Can't find ", path, ". Export it with weekly_report.py --csv-dir first.")
out_dir <- dirname(normalizePath(path))

d <- read.csv(path, stringsAsFactors = FALSE)
d$replied    <- as.logical(toupper(d$replied) %in% c("TRUE", "T", "1"))
d$prior_call <- as.logical(toupper(d$prior_call) %in% c("TRUE", "T", "1"))
d$attempt    <- factor(ifelse(d$nth_email >= 3, "3rd+", ifelse(d$nth_email == 2, "2nd", "1st")),
                       levels = c("1st", "2nd", "3rd+"))
d$day_type   <- factor(ifelse(d$weekday >= 6, "Weekend", "Weekday"), levels = c("Weekday", "Weekend"))

n <- nrow(d)
cat(sprintf("Emails analysed: %d   Replies within 14 days: %d (%.0f%%)\n\n", n, sum(d$replied), 100 * mean(d$replied)))

# 1-2. Reply rates with 95% Wilson intervals (honest for small groups) --------
wilson <- function(x, n, z = 1.96) {
  if (n == 0) return(c(NA, NA))
  p <- x / n
  centre <- (p + z^2 / (2 * n)) / (1 + z^2 / n)
  half <- z * sqrt(p * (1 - p) / n + z^2 / (4 * n^2)) / (1 + z^2 / n)
  c(centre - half, centre + half)
}
rate_table <- function(group) {
  t <- aggregate(replied ~ g, data = data.frame(replied = d$replied, g = group), FUN = function(v) c(n = length(v), x = sum(v)))
  t <- data.frame(group = t$g, emails = t$replied[, "n"], replies = t$replied[, "x"])
  ci <- t(mapply(wilson, t$replies, t$emails))
  t$rate <- t$replies / t$emails
  t$low <- ci[, 1]; t$high <- ci[, 2]
  t
}
by_attempt <- rate_table(d$attempt)
by_day     <- rate_table(d$day_type)
fmt <- function(t) {
  data.frame(Group = t$group, Emails = t$emails, Replies = t$replies,
             `Reply rate` = sprintf("%.0f%%", 100 * t$rate),
             `95% interval` = sprintf("%.0f%% to %.0f%%", 100 * t$low, 100 * t$high), check.names = FALSE)
}
cat("Reply rate by attempt\n"); print(fmt(by_attempt), row.names = FALSE); cat("\n")
cat("Reply rate by day sent\n"); print(fmt(by_day), row.names = FALSE); cat("\n")

# 3. Logistic regression -------------------------------------------------------
# log-odds(reply) = b0 + b1*attempt + b2*weekend + b3*prior_call
terms <- c("attempt", "day_type", "prior_call")
keep <- terms[sapply(terms, function(v) length(unique(d[[v]])) > 1)]   # drop terms with no variation
model_text <- "Not enough variation in the data to fit a model yet."
odds <- NULL
if (length(keep) > 0 && n >= 10 && length(unique(d$replied)) > 1) {
  f <- as.formula(paste("replied ~", paste(keep, collapse = " + ")))
  fit <- tryCatch(suppressWarnings(glm(f, data = d, family = binomial())), error = function(e) NULL)
  if (!is.null(fit)) {
    est <- coef(summary(fit))
    se_ok <- is.finite(est[, 2]) & est[, 2] < 10      # separation makes standard errors explode
    odds <- data.frame(
      Term = rownames(est),
      `Odds ratio` = sprintf("%.2f", exp(est[, 1])),
      `95% interval` = ifelse(se_ok, sprintf("%.2f to %.2f", exp(est[, 1] - 1.96 * est[, 2]), exp(est[, 1] + 1.96 * est[, 2])), "too few cases"),
      `p value` = ifelse(se_ok, sprintf("%.3f", est[, 4]), "n/a"), check.names = FALSE)
    odds <- odds[odds$Term != "(Intercept)", ]
    cat("Logistic regression:", deparse(f), "\n")
    print(odds, row.names = FALSE)
    model_text <- paste0("Model: `", deparse(f), "` (logistic regression, ", n, " emails). An odds ratio above 1 means more likely to get a reply.")
  }
}
caution <- if (n < 200) sprintf("\nWith %d emails, intervals are wide. Treat these as directions to watch, not conclusions; rerun as the club logs more outreach.\n", n) else ""
cat(caution)

# Chart: reply rate by attempt with intervals ----------------------------------
png(file.path(out_dir, "reply_rates.png"), width = 900, height = 520, res = 120)
par(mar = c(4, 4.5, 3, 1), family = "sans")
mids <- barplot(100 * by_attempt$rate, names.arg = by_attempt$group, ylim = c(0, 100),
                col = "#1F3B73", border = NA, ylab = "Reply rate (%)", xlab = "Email",
                main = "Reply rate: first email vs follow-ups")
arrows(mids, 100 * by_attempt$low, mids, 100 * by_attempt$high, angle = 90, code = 3, length = 0.05, col = "#8B97AD")
text(mids, 100 * by_attempt$rate + 6, sprintf("%d of %d", by_attempt$replies, by_attempt$emails), cex = 0.85, col = "#16203A")
invisible(dev.off())

# Markdown summary ---------------------------------------------------------------
md_table <- function(df) {
  c(paste("|", paste(names(df), collapse = " | "), "|"), paste("|", paste(rep("---", ncol(df)), collapse = " | "), "|"),
    apply(df, 1, function(r) paste("|", paste(r, collapse = " | "), "|")))
}
lines <- c("# What gets replies", "",
           sprintf("%d emails, %d replies within 14 days (%.0f%%).", n, sum(d$replied), 100 * mean(d$replied)), "",
           "## By attempt", md_table(fmt(by_attempt)), "", "![Reply rate by attempt](reply_rates.png)", "",
           "## By day sent", md_table(fmt(by_day)), "",
           "## Model", model_text, "", if (!is.null(odds)) md_table(odds) else character(0), "", caution)
writeLines(lines, file.path(out_dir, "reply_analysis.md"))
cat("\nWrote", file.path(out_dir, "reply_analysis.md"), "and reply_rates.png\n")
