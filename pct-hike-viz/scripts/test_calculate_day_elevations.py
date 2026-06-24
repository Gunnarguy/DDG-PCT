import unittest
import math
from calculate_day_elevations import haversine

class TestCalculateDayElevations(unittest.TestCase):
    def test_haversine_identical_points(self):
        """Distance between the same point should be 0."""
        self.assertEqual(haversine(0, 0, 0, 0), 0)
        self.assertEqual(haversine(-120, 45, -120, 45), 0)

    def test_haversine_equator(self):
        """Test distance along the equator (1 degree change in longitude)."""
        # Earth radius = 6371000m
        # Circumference = 2 * pi * 6371000 = ~40,030,173.6m
        # 1 degree = circumference / 360 = ~111,194.926m
        expected_distance = (2 * math.pi * 6371000) / 360
        actual_distance = haversine(0, 0, 1, 0)
        self.assertAlmostEqual(actual_distance, expected_distance, delta=1.0)

    def test_haversine_meridian(self):
        """Test distance along a meridian (1 degree change in latitude)."""
        expected_distance = (2 * math.pi * 6371000) / 360
        actual_distance = haversine(0, 0, 0, 1)
        self.assertAlmostEqual(actual_distance, expected_distance, delta=1.0)

    def test_haversine_negative_coordinates(self):
        """Test distance with negative coordinates (e.g. crossing equator)."""
        # Same distance as 0 to 1 but from -1 to 0
        expected_distance = (2 * math.pi * 6371000) / 360
        actual_distance = haversine(0, -1, 0, 0)
        self.assertAlmostEqual(actual_distance, expected_distance, delta=1.0)

    def test_haversine_known_distance(self):
        """Test distance between two known coordinates (London to Paris).
           London: 51.5074° N, 0.1278° W -> (-0.1278, 51.5074)
           Paris: 48.8566° N, 2.3522° E  -> (2.3522, 48.8566)
           Roughly 343 km.
        """
        actual_distance = haversine(-0.1278, 51.5074, 2.3522, 48.8566)
        # 343 km = 343000 m. Let's give it a generous delta of 1km since Earth is not a perfect sphere.
        self.assertTrue(342000 < actual_distance < 344500)

if __name__ == '__main__':
    unittest.main()
