from __future__ import annotations
import io
from typing import Tuple
import numpy as np
from scipy.fft import dct
from scipy.io import wavfile
from scipy.signal import spectrogram


def compute_fingerprint(pcm_data: np.ndarray, sample_rate: int) -> list[list[float]]:
    if pcm_data.ndim > 1:
        pcm_data = pcm_data.mean(axis=1)
    f, t, Sxx = spectrogram(pcm_data, fs=sample_rate, npersson=2048, noverlap=1536)
    log_Sxx = np.log(np.abs(Sxx) + 1e-6)
    dct_coeffs = dct(log_Sxx, axis=0, type=2, norm="ortho")
    bands = dct_coeffs[:32]
    fingerprints: list[list[float]] = []
    for i in range(bands.shape[1] - 1):
        fp = bands[:, i].tolist()
        fingerprints.append(fp)
    return fingerprints


def fingerprint_to_vector(fp: list[list[float]]) -> np.ndarray:
    flat = np.array(fp, dtype=np.float64).flatten()
    norm = np.linalg.norm(flat)
    if norm > 0:
        flat = flat / norm
    return flat


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def match_fingerprint(query_fp: list[list[float]], stored_fingerprints: list[list[list[float]]], threshold: float = 0.75) -> Tuple[int, float]:
    query_vec = fingerprint_to_vector(query_fp)
    best_idx = -1
    best_score = 0.0
    for idx, stored_fp in enumerate(stored_fingerprints):
        stored_vec = fingerprint_to_vector(stored_fp)
        score = cosine_similarity(query_vec, stored_vec)
        if score > best_score:
            best_score = score
            best_idx = idx
    if best_score < threshold:
        return -1, best_score
    return best_idx, best_score


def extract_metadata(file_path: str) -> Tuple[str, str, float]:
    try:
        sample_rate, data = wavfile.read(file_path)
        duration = float(data.shape[0] / sample_rate)
    except Exception:
        sample_rate = 44100
        duration = 0.0
    title = file_path.split("\\")[-1].rsplit(".", 1)[0] if "\\" in file_path else file_path.split("/")[-1].rsplit(".", 1)[0]
    return title, "Unknown Artist", duration
