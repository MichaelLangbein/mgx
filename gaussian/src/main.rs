mod gaussian;

use gaussian::{gaussian_sum};

fn main() {
    let data = vec![1.0, 2.0, 3.0];
    let sum = gaussian_sum(data);
    println!("{}", sum);
}