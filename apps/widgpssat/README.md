# GPS Power Status Widget

A widget that shows a status of the GPS and number of satellites used for fix.

- Uses Bangle.isGPSOn(), requires firmware v2.08.167 or later
- Uses Bangle.getGPSFix, requires NMEA GGA messages enabled
- Shows in grey(clear) when the GPS is off
- Shows in flashing red when the GPS is on, no fix
- Shows in green when fix was established


