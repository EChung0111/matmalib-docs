# CarPpy reference structures and algorithm provenance

Source project: [EChung0111/CarPpy](https://github.com/EChung0111/CarPpy),
by the CarPpy contributors. Reference commit:
`4589b228cf8772b0f2bd6ccae8bb2f41ad1e7d70` (2025-08-25).

The topology and atom-numbering logic in `matmalib/_carbohydrates.py` adapts
the following methods from
[CarP/conformer.py](https://github.com/EChung0111/CarPpy/blob/4589b228cf8772b0f2bd6ccae8bb2f41ad1e7d70/CarP/conformer.py):

- `connectivity_matrix`: heavy-atom and hydrogen distance cutoffs, with
  nearest-heavy-atom assignment for hydrogens.
- `sort_ring_atoms`: find five- and six-membered sugar rings containing
  one oxygen.
- `pyranose_basis` and `furanose_basis`: orient ring carbons relative to the
  ring oxygen and number the carbon backbone.
- `glycosidic_link_check`: identify a heteroatom connecting an anomeric
  carbon to a carbon in another sugar.

The adaptation works with matmalib `Atom`, `State`, and `Fragment` objects
and does not require CarPpy at runtime. It corrects index/element comparisons
in the original furanose path, explicitly handles aldose versus ketose
numbering, checks for ambiguous assignments, and enumerates bounded carbon
paths to avoid depending on cycle-basis ordering. It additionally requires
substituents on at least two ring carbons to reject bare cyclic ethers.
Monomer partitioning at glycosidic donor bonds and fixed assignments across
trajectory frames are matmalib additions.

These fixtures retain the upstream atom order and coordinates. Their XYZ
comment lines have been replaced with source paths.

| Local fixture | Source path at the reference commit |
| --- | --- |
| `glucose.xyz` | `CarP/benchmarks/glucose/geometry.xyz` |
| `fucosylated_trisaccharide.xyz` | `CarP/benchmarks/Fuc_a14a_conf_0003.xyz` |
| `glycan.xyz` | `CarP/benchmarks/glycan.xyz` |

The expected atom-number dictionaries for all 15 monomers were compared
against the pinned CarPpy `sort_ring_atoms`/`pyranose_basis` routines.
The tests retain the expected ring order without requiring upstream code
or network access. Furanose, ketose, and ambiguous-numbering tests use
separately constructed topology fixtures.

Additional analysis adapts the same pinned source:

- `CarP/utilities.py::ring_pucker_dict`, `ring_dihedrals`, and `ring_canon`
  supply the 38 canonical six-membered references and three-angle nearest
  reference convention. matmalib uses a robust signed `atan2` dihedral,
  explicit planar handling, and optional distance rejection. Five-membered
  envelope/twist phase classification is a matmalib addition.
- `CarP/conformer.py` supplies backbone-neighbor and glycosidic torsion
  conventions. Sugar stereochemistry uses signed tetrahedral volumes and
  connectivity checks rather than conformation-dependent dihedral tests;
  alpha/beta assignments are checked against the actual anomeric substituent
  and D/L reference center, correcting inverted upstream anomer labels for
  the fixtures. Unsupported naming stays Unknown.
- `CarP/conf_space.py::cluster` motivates RMSD clustering and energy-selected
  representatives. The implementation uses Kabsch alignment and SciPy's
  condensed distance input. It does not pass square distance-matrix rows as
  feature vectors, as the upstream clustering routine does. Medoids,
  complete-linkage duplicate removal, and nonmutating results are additions.
- SNFG drawing functionality follows CarPpy's carbohydrate diagrams, with
  independently generated Matplotlib vector shapes using the official
  [SNFG specification](https://www.ncbi.nlm.nih.gov/glycans/snfg.html).
  No upstream SVG assets or external image paths are needed at runtime.

`glucose_puckers.xyz` concatenates all 38 upstream
`CarP/benchmarks/glucose/conf_<label>/conf.xyz` files in path order. Only the
XYZ comments are replaced by the source paths. Tests verify every canonical
label, rigid-motion invariance, and trajectory classification against these
coordinates without importing or downloading upstream code.
