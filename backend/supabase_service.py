import os
from typing import Optional
from supabase import create_client, Client

# Supabase Configuration
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

_client: Optional[Client] = None

def get_supabase() -> Client:
    """
    Returns a singleton Supabase client.
    Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
    """
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            # Fallback to a dummy client or raise error if in production
            if os.environ.get("DEBUG", "false").lower() == "true":
                print("WARNING: Supabase credentials missing. Rate limiting will be disabled.")
                return None
            raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing")
        
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client

async def check_rate_limit(user_id: str) -> bool:
    """
    Calls the check_and_increment_usage RPC on Supabase.
    Returns True if allowed, False if rate-limited.
    """
    client = get_supabase()
    if client is None:
        return True # Default to allow if not configured (dev mode)

    try:
        # Note: rpc() in supabase-py is synchronous in the current version, 
        # or can be used with postgrest-py's async features if using the async client.
        # We'll use the standard synchronous call for now as it's simpler.
        response = client.rpc("check_and_increment_usage", {"p_user_id": user_id}).execute()
        return bool(response.data)
    except Exception as e:
        print(f"Error checking rate limit: {e}")
        return True # Fail open to avoid blocking users if Supabase is down

async def upload_to_storage(bucket: str, path: str, file_content: bytes, content_type: str = "image/png") -> Optional[str]:
    """
    Uploads a file to Supabase Storage and returns the public URL.
    """
    client = get_supabase()
    if client is None:
        return None

    try:
        # Upload the file
        client.storage.from_(bucket).upload(
            path=path,
            file=file_content,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        
        # Get public URL
        response = client.storage.from_(bucket).get_public_url(path)
        return response
    except Exception as e:
        print(f"Error uploading to storage: {e}")
        return None
