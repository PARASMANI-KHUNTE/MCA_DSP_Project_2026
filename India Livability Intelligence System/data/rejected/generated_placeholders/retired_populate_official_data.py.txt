"""Retired fake-data generator.

The previous version wrote hand-authored example values into raw-source paths
and labelled them as official NCRB, SRS, RBI, MoSPI, and CPCB observations.
That content was not source-derived. The files are intentionally no longer
generated here. Acquire the actual published source tables, document their
provenance in data/raw/source_register.csv, then run the normal loaders.

The pipeline fingerprints and refuses the exact placeholder files generated
by the retired implementation until they are replaced with verified data.
"""


def main() -> None:
    raise RuntimeError(
        "This command was retired because it generated fabricated values in "
        "files labelled as official observations. Download and validate the "
        "published datasets instead."
    )


if __name__ == "__main__":
    main()
