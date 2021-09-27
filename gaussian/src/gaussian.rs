extern crate nalgebra as na;

use nalgebra::{DMatrix, DVector, Dynamic, OMatrix, U2};

pub type PointList = OMatrix<f64, Dynamic, U2>;


pub struct GaussianResult {
    mean: DVector<f64>,
    var: DMatrix<f64>,
}

fn distance(x1: f64, y1: f64, x2: f64, y2: f64) -> f64 {
    f64::sqrt((x1 - x2).powi(2) + (y1 - y2).powi(2))
}

fn distance_matrix(pos1: &PointList, pos2: &PointList) -> DMatrix<f64> {
    let r = pos1.nrows();
    let c = pos2.nrows();
    let mut dist_matrix = DMatrix::from_element(r, c, 0.0);
    for i in 0..r {
        for j in 0..c {
            let x1 = pos1[(i, 0)];
            let y1 = pos1[(i, 1)];
            let x2 = pos2[(j, 0)];
            let y2 = pos2[(j, 1)];
            let dist = distance(x1, y1, x2, y2);
            dist_matrix[(i, j)] = dist;
        }
    }
    dist_matrix
}

fn gaussian_mean(
    mu_r: &DVector<f64>,
    mu_s: &DVector<f64>,
    y_s: &DVector<f64>,
    sigma_rs: &DMatrix<f64>,
    sigma_inv_ss: &DMatrix<f64>,
) -> DVector<f64> {
    let mu_new_r = mu_r + sigma_rs * sigma_inv_ss * (y_s - mu_s);
    mu_new_r
}

fn gaussian_var(
    sigma_rr: &DMatrix<f64>,
    sigma_rs: &DMatrix<f64>,
    sigma_inv_ss: &DMatrix<f64>,
    sigma_sr: &DMatrix<f64>,
) -> DMatrix<f64> {
    let sigma_new_rr = sigma_rr - sigma_rs * sigma_inv_ss * sigma_sr;
    sigma_new_rr
}

pub fn create_cov_matrix(
    cov0: f64,
    cov_inft: f64,
    h95: f64,
    pos1: &PointList,
    pos2: &PointList,
) -> DMatrix<f64> {
    let cov_func = |d| cov0 - cov_inft * (1.0 - f64::exp(-3.0 * d / h95));
    let dist = distance_matrix(&pos1, &pos2);
    let cov_mtrx = dist.map(cov_func);
    cov_mtrx
}

pub fn gaussian_posterior(
    pos_s: &PointList,
    pos_r: &PointList,
    mu_s: &DVector<f64>,
    mu_r: &DVector<f64>,
    val_s: &DVector<f64>,
    cov0: f64,
    cov_inft: f64,
    h95: f64,
) -> GaussianResult {
    let sigma_ss = create_cov_matrix(cov0, cov_inft, h95, &pos_s, &pos_s);
    let sigma_rs = create_cov_matrix(cov0, cov_inft, h95, &pos_r, &pos_s);
    let sigma_sr = sigma_rs.transpose();
    let sigma_rr = create_cov_matrix(cov0, cov_inft, h95, &pos_r, &pos_r);
    // let sigma_inv_ss = sigma_ss.try_inverse().expect("Could not invert sigma_ss!");
    // faster than normal inverse: cholesky (only works because sigma_ss is PSD)
    let sigma_inv_ss = sigma_ss
        .cholesky()
        .expect("Could not invert sigma_ss!")
        .inverse();

    let mu_new_r = gaussian_mean(&mu_r, &mu_s, &val_s, &sigma_rs, &sigma_inv_ss);
    let sigma_new_rr = gaussian_var(&sigma_rr, &sigma_rs, &sigma_inv_ss, &sigma_sr);

    GaussianResult {
        mean: mu_new_r,
        var: sigma_new_rr,
    }
}

pub fn gaussian_sample(mu: &DVector<f64>, sigma: &DMatrix<f64>) {}

pub fn gaussian_sum(data: Vec<f32>) -> f32 {
    let s: f32 = data.iter().sum();
    s + 1.0
}

#[cfg(test)]
mod tests {

    use crate::gaussian::{gaussian_posterior, PointList};
    use nalgebra::DVector;


    #[test]
    fn test_gaussian_posterior() {
        let pos_s = PointList::from_row_slice(&[1.0, 1.0]);
        let pos_r = PointList::from_row_slice(&[0.0, 0.0, 1.0, 0.0, 0.0, 1.1]);
        let val_s = DVector::from_row_slice(&[1.0]);
        let mu_s = DVector::from_row_slice(&[0.0]);
        let mu_r = DVector::from_row_slice(&[0.0, 0.0, 0.0]);
        let cov0 = 1.0;
        let cov_inft = 0.5;
        let h95 = 1.0;

        let result = gaussian_posterior(&pos_s, &pos_r, &mu_s, &mu_r, &val_s, cov0, cov_inft, h95);
        assert_eq!(result.mean[0], 0.5071847980452195);
        assert_eq!(result.mean[1], 0.524893534183932);
        assert_eq!(result.mean[2], 0.5245238328004868);
        assert_eq!(result.var[(0, 0)], 0.7427635806318298);
        assert_eq!(result.var[(2, 2)], 0.724874748824287);
        assert_eq!(result.var[(0, 1)], 0.2586755130536129);
        assert_eq!(result.var[(0, 2)], 0.2524110694918006);
        assert_eq!(result.var[(1, 2)], 0.23046305037850517);
    }
}
