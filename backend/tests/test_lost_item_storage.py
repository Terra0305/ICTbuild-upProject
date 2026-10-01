from types import SimpleNamespace

from app.services.lost_item_service import _public_image_url, _s3_client_kwargs


def _settings(**overrides) -> SimpleNamespace:
    values = {
        "storage_endpoint": "",
        "storage_bucket": "refind-s3-uploads",
        "storage_access_key": "",
        "storage_secret_key": "",
        "storage_region": "",
        "storage_public_base_url": "",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_s3_client_kwargs_omit_empty_values_so_instance_role_is_used() -> None:
    kwargs = _s3_client_kwargs(_settings(storage_region="ap-northeast-2"))
    assert kwargs == {"region_name": "ap-northeast-2"}


def test_s3_client_kwargs_pass_explicit_credentials_for_s3_compatible_storage() -> None:
    kwargs = _s3_client_kwargs(
        _settings(
            storage_endpoint="https://storage.example.com",
            storage_access_key="key",
            storage_secret_key="secret",
        )
    )
    assert kwargs == {
        "endpoint_url": "https://storage.example.com",
        "aws_access_key_id": "key",
        "aws_secret_access_key": "secret",
    }


def test_public_image_url_prefers_public_base_url() -> None:
    url = _public_image_url(
        _settings(storage_public_base_url="https://d123.cloudfront.net/"), "lost-items/a.png"
    )
    assert url == "https://d123.cloudfront.net/lost-items/a.png"


def test_public_image_url_falls_back_to_path_style_endpoint() -> None:
    url = _public_image_url(
        _settings(storage_endpoint="https://storage.example.com/"), "lost-items/a.png"
    )
    assert url == "https://storage.example.com/refind-s3-uploads/lost-items/a.png"
