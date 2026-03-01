/**
 * Precise chi-squared upper-tail p-value matching R's pchisq(x, df, lower.tail=FALSE).
 * Uses regularized incomplete gamma function via series/continued-fraction.
 */

/**
 * Log-gamma via Lanczos approximation (g=7, n=9).
 */
function lgamma(x: number): number {
  if (x <= 0) return Infinity;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let sum = c[0]!;
  for (let i = 1; i < 9; i++) {
    sum += c[i]! / (x + i - 1);
  }
  const t = x + 6.5;
  return 0.5 * Math.log(2 * Math.PI) + (x - 0.5) * Math.log(t) - t + Math.log(sum);
}

/**
 * Regularized lower incomplete gamma P(a, x) via series expansion.
 * P(a, x) = e^(-x) * x^a * sum_{n=0}^inf x^n / (a*(a+1)*...*(a+n))
 */
function gammaPSeries(a: number, x: number): number {
  if (x === 0) return 0;
  const maxIter = 200;
  const eps = 1e-15;
  let term = 1 / a;
  let sum = term;
  for (let n = 1; n <= maxIter; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * eps) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
}

/**
 * Regularized upper incomplete gamma Q(a, x) via continued fraction (Lentz).
 * Q(a, x) = e^(-x) * x^a / Gamma(a) * CF
 */
function gammaQCF(a: number, x: number): number {
  const maxIter = 200;
  const eps = 1e-15;
  const tiny = 1e-30;

  // Modified Lentz's method for CF:
  // Q(a,x) = e^(-x) * x^a / Gamma(a) * 1/(x+1-a- 1*(1-a)/(x+3-a- 2*(2-a)/(x+5-a- ...)))
  // Using the standard a_i, b_i recurrence
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;

  for (let i = 1; i <= maxIter; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < eps) break;
  }

  return h * Math.exp(-x + a * Math.log(x) - lgamma(a));
}

/**
 * Regularized upper incomplete gamma Q(a, x) = 1 - P(a, x).
 * Chooses series or CF based on argument magnitudes.
 */
function gammaQ(a: number, x: number): number {
  if (x < 0) return 1;
  if (x === 0) return 1;
  if (a === 0) return 0;

  // Use series for P when x < a+1 (converges faster), then Q = 1-P
  // Use CF for Q when x >= a+1 (converges faster)
  if (x < a + 1) {
    return 1 - gammaPSeries(a, x);
  }
  return gammaQCF(a, x);
}

/**
 * Chi-squared upper-tail p-value: P(X > x) for X ~ chi2(df).
 * Matches R's pchisq(x, df, lower.tail=FALSE) = Q(df/2, x/2).
 */
export function chiSqUpperTail(x: number, df: number): number {
  if (x <= 0) return 1;
  if (df <= 0) return NaN;
  return gammaQ(df / 2, x / 2);
}
