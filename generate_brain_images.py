import requests
import numpy as np
from PIL import Image, ImageOps
import os
import io

# Constants matching the React App
TISSUES = {
    'CSF': {'t1': 2400, 't2': 160, 'pd': 1.0},
    'WM': {'t1': 600, 't2': 80, 'pd': 0.7},
    'GM': {'t1': 950, 't2': 100, 'pd': 0.8},
    'FAT': {'t1': 250, 't2': 60, 'pd': 0.9},
    'BONE': {'t1': 1, 't2': 1, 'pd': 0.05} # Background
}

def get_brightness(tissue_name, sequence):
    t = TISSUES[tissue_name]
    val = 0
    
    if sequence == 'T1':
        if tissue_name == 'FAT': val = 240
        elif tissue_name == 'CSF': val = 15
        elif tissue_name == 'WM': val = 180
        elif tissue_name == 'GM': val = 110
        elif tissue_name == 'BONE': val = 0
        else: val = max(0, 255 - (t['t1'] * 0.2))
        
    elif sequence == 'T2':
        if tissue_name == 'CSF': val = 255
        elif tissue_name == 'FAT': val = 100
        elif tissue_name == 'WM': val = 80
        elif tissue_name == 'GM': val = 120
        elif tissue_name == 'BONE': val = 0
        else: val = t['t2'] * 2.5
        
    elif sequence == 'FLAIR':
        # T2 w/ CSF nulled
        if tissue_name == 'CSF': val = 0
        elif tissue_name == 'WM': val = 70
        elif tissue_name == 'GM': val = 100 # GM brighter than WM
        elif tissue_name == 'FAT': val = 90
        elif tissue_name == 'BONE': val = 0
        else: val = t['t2'] * 2.5
        
    elif sequence == 'PD':
        val = t['pd'] * 240
        if tissue_name == 'BONE': val = 0
        
    return int(min(255, max(0, val)))

def download_image(url):
    print(f"Downloading {url}...")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return Image.open(io.BytesIO(response.content)).convert('L')

def segment_image(img_array):
    """
    Heuristic segmentation of a T1 weighted image.
    Returns a map of tissue names.
    """
    # Normalize
    img_norm = img_array / 255.0
    
    # Create empty tissue map
    rows, cols = img_array.shape
    tissue_map = np.full((rows, cols), 'BONE', dtype=object)
    
    # Thresholds (tuned for the specific Wikimedia image)
    # The image has black background, dark gray CSF/Bone, gray GM, light gray WM, white Fat/Scalp
    
    # 1. Background/Bone/Air (Very dark)
    mask_bg = img_array < 25
    tissue_map[mask_bg] = 'BONE'
    
    # 2. CSF (Dark but not black - ventricles)
    # In T1, CSF is very dark, often overlapping with background. 
    # We'll assume some central dark areas are CSF.
    # Simple intensity threshold:
    mask_csf = (img_array >= 25) & (img_array < 60)
    tissue_map[mask_csf] = 'CSF'
    
    # 3. Gray Matter (Medium dark)
    mask_gm = (img_array >= 60) & (img_array < 110)
    tissue_map[mask_gm] = 'GM'
    
    # 4. White Matter (Bright)
    mask_wm = (img_array >= 110) & (img_array < 190)
    tissue_map[mask_wm] = 'WM'
    
    # 5. Fat (Very Bright - Scalp/Marrow)
    mask_fat = (img_array >= 190)
    tissue_map[mask_fat] = 'FAT'
    
    return tissue_map

def segment_spine(img_array):
    # Spine T1 Sagittal
    # Bright: Fat, Marrow
    # Dark: CSF, Disc, Air
    # Gray: Cord, Muscle
    
    rows, cols = img_array.shape
    tissue_map = np.full((rows, cols), 'BONE', dtype=object) # Default to background
    
    # Thresholds
    mask_csf_bone = img_array < 40
    tissue_map[mask_csf_bone] = 'CSF' # CSF is dark on T1, also cortical bone
    
    mask_muscle_cord = (img_array >= 40) & (img_array < 100)
    tissue_map[mask_muscle_cord] = 'GM' # Approximate Cord/Muscle as GM-like T1/T2
    
    mask_marrow = (img_array >= 100) & (img_array < 180)
    tissue_map[mask_marrow] = 'WM' # Marrow behaves like fatty tissue/WM
    
    mask_fat = img_array >= 180
    tissue_map[mask_fat] = 'FAT'
    
    return tissue_map

def segment_knee(img_array):
    # Knee T1 Sagittal
    # Bright: Fat, Marrow
    # Dark: Meniscus, Ligaments, Cortical Bone
    # Gray: Muscle, Cartilage
    
    rows, cols = img_array.shape
    tissue_map = np.full((rows, cols), 'BONE', dtype=object)
    
    mask_bone_ligament = img_array < 40
    tissue_map[mask_bone_ligament] = 'BONE'
    
    mask_muscle = (img_array >= 40) & (img_array < 100)
    tissue_map[mask_muscle] = 'MUSCLE' # Need to add MUSCLE to TISSUES if not present, or map to GM
    
    mask_marrow = (img_array >= 100) & (img_array < 180)
    tissue_map[mask_marrow] = 'WM'
    
    mask_fat = img_array >= 180
    tissue_map[mask_fat] = 'FAT'
    
    return tissue_map

def segment_abdomen(img_array):
    # Abdomen T1 Fat Sat (Fat is DARK)
    # We need to reverse logic for Fat
    # Bright: Organs, Muscle
    # Dark: Fat, Air, Bone
    
    rows, cols = img_array.shape
    tissue_map = np.full((rows, cols), 'BONE', dtype=object)
    
    # In FS, Fat is suppressed (dark). 
    # We assume very dark is Air/Bone, Dark-ish is Fat, Bright is Tissue.
    
    mask_air = img_array < 15
    tissue_map[mask_air] = 'BONE'
    
    mask_fat = (img_array >= 15) & (img_array < 50)
    tissue_map[mask_fat] = 'FAT' # We map dark regions to FAT so they become bright in our T1 gen
    
    mask_muscle = (img_array >= 50) & (img_array < 120)
    tissue_map[mask_muscle] = 'MUSCLE'
    
    mask_organ = img_array >= 120
    tissue_map[mask_organ] = 'GM' # Organs like Liver/Spleen
    
    return tissue_map

def process_region(name, url, segment_func):
    print(f"Processing {name}...")
    try:
        img = download_image(url)
        img = img.resize((512, 512))
        img_array = np.array(img)
        
        tissue_map = segment_func(img_array)
        
        output_dir = "public/assets"
        os.makedirs(output_dir, exist_ok=True)
        
        sequences = ['T1', 'T2', 'FLAIR', 'PD']
        for seq in sequences:
            new_img_array = np.zeros_like(img_array)
            for tissue in TISSUES:
                mask = (tissue_map == tissue)
                val = get_brightness(tissue, seq)
                new_img_array[mask] = val
            
            im = Image.fromarray(new_img_array.astype(np.uint8))
            filename = f"{name.lower()}_{seq.lower()}.png"
            path = os.path.join(output_dir, filename)
            im.save(path)
            print(f"Saved {path}")
            
    except Exception as e:
        print(f"Error processing {name}: {e}")

def generate_contrasts():
    # 1. Brain (Local)
    local_file = "MRI_Brain_T1_Axial_(2).jpg"
    if os.path.exists(local_file):
        print(f"Processing Brain (Local)...")
        try:
            original_img = Image.open(local_file).convert('L')
            original_img = original_img.resize((512, 512))
            img_array = np.array(original_img)
            tissue_map = segment_image(img_array)
            
            output_dir = "public/assets"
            os.makedirs(output_dir, exist_ok=True)
            
            for seq in ['T1', 'T2', 'FLAIR', 'PD']:
                new_img_array = np.zeros_like(img_array)
                for tissue in TISSUES:
                    mask = (tissue_map == tissue)
                    val = get_brightness(tissue, seq)
                    new_img_array[mask] = val
                im = Image.fromarray(new_img_array.astype(np.uint8))
                im.save(os.path.join(output_dir, f"brain_{seq.lower()}.png"))
                print(f"Saved brain_{seq.lower()}.png")
        except Exception as e:
            print(f"Error Brain: {e}")
    
    # 2. Spine
    process_region("spine", "https://upload.wikimedia.org/wikipedia/commons/c/c3/SAGITTAL-FSE_T1_MRI.jpg", segment_spine)
    
    # 3. Knee
    process_region("knee", "https://upload.wikimedia.org/wikipedia/commons/e/e2/Knee_MRI_T1_TSE_Sagittal.jpg", segment_knee)
    
    # 4. Abdomen
    process_region("abdomen", "https://upload.wikimedia.org/wikipedia/commons/f/f1/MRI_desmoid_T1_fl2d_FS.jpg", segment_abdomen)

if __name__ == "__main__":
    # Add MUSCLE to TISSUES if missing for the script
    if 'MUSCLE' not in TISSUES:
        TISSUES['MUSCLE'] = {'t1': 900, 't2': 50, 'pd': 0.75}

    generate_contrasts()
