import json
import math
from pathlib import Path

from bokeh.io import output_file, save, show
from bokeh.models import GeoJSONDataSource, HoverTool, LinearColorMapper, ColorBar, BasicTicker
from bokeh.plotting import figure
from bokeh.transform import linear_cmap
from bokeh.palettes import Turbo256


def lon_to_web_mercator(lon):
    k = 6378137
    return lon * (k * math.pi / 180.0)


def lat_to_web_mercator(lat):
    k = 6378137
    lat = max(min(lat, 89.9999), -89.9999)  # avoid infinity at poles
    return math.log(math.tan((90 + lat) * math.pi / 360.0)) * k


def convert_coords_to_mercator(coords):
    """
    Recursively convert GeoJSON lon/lat coordinates to Web Mercator.
    Works for Polygon and MultiPolygon nesting.
    """
    if not coords:
        return coords

    # base case: [lon, lat]
    if isinstance(coords[0], (int, float)):
        lon, lat = coords
        return [lon_to_web_mercator(lon), lat_to_web_mercator(lat)]

    return [convert_coords_to_mercator(c) for c in coords]


def convert_geojson_to_mercator(data):
    """
    Convert all feature geometries from lon/lat to Web Mercator.
    """
    for feature in data.get("features", []):
        geometry = feature.get("geometry")
        if geometry and "coordinates" in geometry:
            geometry["coordinates"] = convert_coords_to_mercator(geometry["coordinates"])
    return data


def assign_dummy_scores(data):
    """
    Add dummy values into feature properties.
    """
    for i, feature in enumerate(data.get("features", [])):
        props = feature.setdefault("properties", {})

        country_name = (
            props.get("shapeName")
            or props.get("name")
            or props.get("NAME")
            or props.get("ADMIN")
            or props.get("admin")
            or f"Country {i+1}"
        )

        props["display_name"] = country_name

        # Dummy score between 40 and 100
        props["dummy_score"] = 40 + (i * 7 % 61)

    return data


def load_and_prepare_geojson(geojson_path):
    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data.get('features', []))} features")

    data = assign_dummy_scores(data)
    data = convert_geojson_to_mercator(data)

    geojson_str = json.dumps(data)
    print(f"Prepared GeoJSON size: {len(geojson_str) / (1024 * 1024):.2f} MB")
    return geojson_str


def create_choropleth_map(geojson_str, output_html="choropleth_tile_demo.html", use_tile=True):
    geo_source = GeoJSONDataSource(geojson=geojson_str)

    color_mapper = LinearColorMapper(
        palette=Turbo256,
        low=40,
        high=100
    )

    p = figure(
        title="Country Choropleth Demo",
        width=1200,
        height=700,
        x_axis_type="mercator",
        y_axis_type="mercator",
        x_range=(-20037508, 20037508),
        y_range=(-8000000, 17000000),
        tools="pan,wheel_zoom,box_zoom,reset,save",
        active_scroll="wheel_zoom",
        match_aspect=True
    )

    if use_tile:
        p.add_tile("CartoDB Positron", retina=True)

    patches = p.patches(
        xs="xs",
        ys="ys",
        source=geo_source,
        fill_color=linear_cmap(
            field_name="dummy_score",
            palette=Turbo256,
            low=40,
            high=100
        ),
        fill_alpha=0.55 if use_tile else 0.85,
        line_color="gray",
        line_width=0.6,
        hover_fill_color="orange",
        hover_line_color="black",
        selection_fill_color="red",
        selection_line_color="black"
    )

    hover = HoverTool(
        renderers=[patches],
        tooltips=[
            ("Country", "@display_name"),
            ("Dummy Score", "@dummy_score"),
        ]
    )
    p.add_tools(hover)

    color_bar = ColorBar(
        color_mapper=color_mapper,
        ticker=BasicTicker(),
        label_standoff=8,
        width=15,
        location=(0, 0),
        title="Dummy Score"
    )
    p.add_layout(color_bar, "right")

    p.axis.visible = False
    p.xgrid.grid_line_color = None
    p.ygrid.grid_line_color = None

    output_file(output_html)
    save(p)
    show(p)

    print(f"Saved to {output_html}")


def main():
    project_root = Path(__file__).resolve().parent.parent.parent
    geojson_path = project_root / "data" / "geojson" / "countries.geojson"

    print("Using file:", geojson_path)
    print("Exists:", geojson_path.exists())

    geojson_str = load_and_prepare_geojson(geojson_path)

    create_choropleth_map(
        geojson_str=geojson_str,
        output_html="choropleth_tile_demo.html",
        use_tile=True
    )


if __name__ == "__main__":
    main()