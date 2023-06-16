#%%
import numpy as np


"""
|name                 |Formula                 |Unit         |      Notes                                                           |
|---------------------|------------------------|-------------|----------------------------------------------------------------------|
|Energy               |Q                       |[J]          |                                                                      |
|Flux                 |F = dQ/dt               |[w]          |                                                                      |
|Irradiance           |E = F/A                 |[W/m^2]      |  Flux arriving at receiver-surface. E = rho T⁴ by Boltzmann's law.   |
|                     |                        |             |  Think of *ir*radiance as *integrated* radiance                      |
|Monochr. irradiance: |Elambda = dE/dlambda    |[W/m^3]      |  E_lambda = B * PI for equally distributed radiance                  |
|Radiance             |B = dElambda / domega   |[W/m^3 angle]|  Planck's law: B(lambda, T)                                          |
"""


k   = 1.381e-23   # Boltzmann  [J/K]
h   = 6.626e-34   # Planck     [Js]
c   = 2.998e8     # lightspeed [m/s]
rho = 5.670e-8    # S.Bolzmann [W/(m²K⁴)]


"""
UV
VIS
IR
Micro
Radio
"""

# Top: high wavelength, low endergy
lambda_radio_start = 1000000
lambda_radio_end   = 1  # [m]
lambda_micro_start = lambda_radio_end
lambda_micro_end   = 1e-3
lambda_ir_start    = lambda_micro_end
lambda_ir_end      = 0.75e-6
lambda_vis_start   = lambda_ir_end
lambda_vis_end     = 0.38e-6
lambda_uv_start    = lambda_vis_end
lambda_uv_end      = 10e-9
# Bottom: low wavelength, high energy


def wave_energy(wavelength):
    energy = h * c / wavelength  # [J]
    return energy


def black_body_radiance(wavelength, temperature):
    """
        Planck's law: https://en.wikipedia.org/wiki/Planck%27s_law
        wavelength: [meter]
        temperature: [°Kelvin]
    """
    factor = (2.0 * h * c**2) / (wavelength**5)
    exponent = (h * c) / (wavelength * k * temperature)
    radiance =  factor / (np.exp(exponent) - 1)
    return radiance


def black_body_temperature(wavelength, radiance):
    """
        Planck's law, solved for T
        wavelength: [meter]
        radiance: [W/m³ angle]
    """
    factor = (h * c) / k
    loged = (2 * h * c**2) / (wavelength**5 * radiance)
    return factor / (wavelength * np.log(loged + 1))



def black_body_most_intense_wavelength(temperature):
    """
        Wien's law:
        dB/dlambda = 0 -> lambda_max = 0.002898 [meter*Kelvin] /T
    """
    return 0.002898 / temperature


def black_body_irradiance(temperature):
    """
        Boltzmann's law:
        E = int_0^infty pi * I(lambda, T) dlambda = rho * T^4
    """
    return rho * np.power(temperature, 4)




#%%
if __name__ == '__main__':

    #%% Exercise 1: 
    # burning wood
    # mostly radiates IR (== heat)
    # but also a little VIS

    t_wood_burning = 273 + 900                                      # [K]
    irrad = black_body_irradiance(t_wood_burning)                   # 107000 [W/m²]
    lambd = black_body_most_intense_wavelength(t_wood_burning)      # 2.4e-6 m 
    assert(lambda_ir_start > lambd > lambda_ir_end)                 # max wave is in IR

    radVisStart = black_body_radiance(lambda_vis_start, t_wood_burning)  # 145 [W/m³]
    radVisEnd   = black_body_radiance(lambda_vis_end,   t_wood_burning)  # 39 MIO [W/m³]
    visRange = lambda_vis_start - lambda_vis_end
    radRange = radVisEnd - radVisStart
    irradVis = np.pi * (radVisStart * visRange + 0.5 * visRange * radRange)  # poor man's integration
    assert(irradVis < irrad)



    # %% Exercise 2:
    # Irradiance from sun 
    F_sun = 3.9e26  # [W]
    A_sun = 4 * np.pi * 7e8**2
    E_sun = F_sun / A_sun

    # Flux through sphere around sun is equal to flux through shpere around sun with radius all the way to earth
    # F_sun = F_sun_earth
    # E_earth_distance = E_sun A_sun / A_earth_distance
    A_earth_distance = 4 * np.pi * 1.5e11**2
    E_earth = F_sun / A_earth_distance

    # That's only 0.002% of the irradiance directly on the sun's surface.

    # %%
