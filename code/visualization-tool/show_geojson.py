import json
from pathlib import Path

from bokeh.io import output_file, save
from bokeh.models import (
    GeoJSONDataSource,
    ColumnDataSource,
    CustomJS,
    LabelSet
)
from bokeh.plotting import figure
from bokeh.transform import linear_cmap
from bokeh.palettes import Turbo256


def flatten_coords(coords):
    """
    Recursively flatten nested coordinate lists into [(x, y), ...]
    """
    points = []
    if not coords:
        return points

    if isinstance(coords[0], (int, float)):
        return [(coords[0], coords[1])]

    for item in coords:
        points.extend(flatten_coords(item))
    return points


def compute_feature_centroid(feature):
    """
    Approximate centroid by averaging all polygon coordinates.
    This is not a perfect geographic centroid, but it is sufficient
    for quick preview labels.
    """
    geometry = feature.get("geometry", {})
    coords = geometry.get("coordinates", [])

    points = flatten_coords(coords)

    if not points:
        return None, None

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]

    return sum(xs) / len(xs), sum(ys) / len(ys)


def load_geojson_with_dummy_values_and_labels(geojson_path, max_features=None):
    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])

    if max_features is not None:
        features = features[:max_features]
        data["features"] = features

    print(f"Total features used: {len(features)}")

    label_x = []
    label_y = []
    label_name = []

    for i, feature in enumerate(features):
        props = feature.setdefault("properties", {})
        props["dummy_value"] = i + 1
        props["display_name"] = (
            props.get("shapeName")
            or props.get("name")
            or props.get("NAME")
            or props.get("ADMIN")
            or props.get("continent")
            or f"Region {i+1}"
        )

        cx, cy = compute_feature_centroid(feature)
        if cx is not None and cy is not None:
            label_x.append(cx)
            label_y.append(cy)
            label_name.append(props["display_name"])

    geojson_str = json.dumps(data)
    print(f"GeoJSON size: {len(geojson_str) / (1024 * 1024):.2f} MB")

    labels_source = ColumnDataSource(data={
        "x": label_x,
        "y": label_y,
        "name": label_name,
        "text_alpha": [0.0] * len(label_name),   # start hidden
        "text_size": ["6pt"] * len(label_name)
    })

    return geojson_str, labels_source


def create_geojson_map(geojson_str, labels_source, output_html="geojson_preview.html"):
    geo_source = GeoJSONDataSource(geojson=geojson_str)

    p = figure(
        width=1100,
        height=650,
        tools="pan,wheel_zoom,reset,save",
        active_scroll="wheel_zoom",
        match_aspect=True,
        title="GeoJSON Preview with Labels"
    )

    p.patches(
        xs="xs",
        ys="ys",
        source=geo_source,
        fill_color=linear_cmap("dummy_value", Turbo256, 1, 200),
        fill_alpha=0.8,
        line_color="gray",
        line_width=0.5
    )

    labels = LabelSet(
        x="x",
        y="y",
        text="name",
        source=labels_source,
        text_font_size="text_size",
        text_alpha="text_alpha",
        text_align="center",
        text_baseline="middle"
    )

    p.add_layout(labels)

    p.axis.visible = False
    p.xgrid.grid_line_color = None
    p.ygrid.grid_line_color = None

    # Zoom level-like behavior based on visible x-range width
    callback = CustomJS(args=dict(source=labels_source, x_range=p.x_range), code="""
        const data = source.data;
        const width = x_range.end - x_range.start;

        for (let i = 0; i < data['name'].length; i++) {
            if (width > 250) {
                data['text_alpha'][i] = 0.0;      // too far: hide
                data['text_size'][i] = '5pt';
            } else if (width > 120) {
                data['text_alpha'][i] = 0.35;     // medium zoom
                data['text_size'][i] = '6pt';
            } else if (width > 60) {
                data['text_alpha'][i] = 0.65;
                data['text_size'][i] = '8pt';
            } else {
                data['text_alpha'][i] = 1.0;      // close zoom
                data['text_size'][i] = '10pt';
            }
        }

        source.change.emit();
    """)

    p.x_range.js_on_change("start", callback)
    p.x_range.js_on_change("end", callback)

    output_file(output_html)
    save(p)
    print(f"Saved to {output_html}")


def main():
    base_dir = Path(__file__).resolve().parent.parent.parent
    geojson_path = base_dir / "data" / "geojson" / "countries.geojson"

    print("Looking for:", geojson_path)

    geojson_str, labels_source = load_geojson_with_dummy_values_and_labels(geojson_path)

    create_geojson_map(
        geojson_str=geojson_str,
        labels_source=labels_source,
        output_html="test_preview.html"
    )


if __name__ == "__main__":
    main()