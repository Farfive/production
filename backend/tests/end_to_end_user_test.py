import pytest
 
# Skip entire module unless explicit integration run
pytest.skip("Integration test – requires running backend server", allow_module_level=True) 