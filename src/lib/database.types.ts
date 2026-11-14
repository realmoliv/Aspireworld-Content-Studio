export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: 'admin' | 'editor' | 'reviewer';
          avatar_initials: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: 'admin' | 'editor' | 'reviewer';
          avatar_initials: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: 'admin' | 'editor' | 'reviewer';
          avatar_initials?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          title: string;
          content_type: string;
          pillar: string;
          goal: string;
          post_date: string;
          post_time: string;
          status: string;
          priority: string;
          brief: string;
          copy_on_screen: string;
          copy_caption: string;
          copy_hashtags: string;
          copy_cta: string;
          copy_script: string;
          verify_date: boolean;
          assignee_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content_type: string;
          pillar: string;
          goal: string;
          post_date: string;
          post_time: string;
          status: string;
          priority: string;
          brief: string;
          copy_on_screen: string;
          copy_caption: string;
          copy_hashtags: string;
          copy_cta: string;
          copy_script: string;
          verify_date?: boolean;
          assignee_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content_type?: string;
          pillar?: string;
          goal?: string;
          post_date?: string;
          post_time?: string;
          status?: string;
          priority?: string;
          brief?: string;
          copy_on_screen?: string;
          copy_caption?: string;
          copy_hashtags?: string;
          copy_cta?: string;
          copy_script?: string;
          verify_date?: boolean;
          assignee_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'items_assignee_id_fkey';
            columns: ['assignee_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      item_references: {
        Row: {
          id: string;
          item_id: string;
          label: string;
          url: string;
          instruction: string;
          ref_type: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          item_id: string;
          label: string;
          url: string;
          instruction: string;
          ref_type: string;
          sort_order: number;
        };
        Update: {
          id?: string;
          item_id?: string;
          label?: string;
          url?: string;
          instruction?: string;
          ref_type?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'item_references_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };
      item_shots: {
        Row: {
          id: string;
          item_id: string;
          shot_order: string;
          visual: string;
          text_on_screen: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          item_id: string;
          shot_order: string;
          visual: string;
          text_on_screen: string;
          sort_order: number;
        };
        Update: {
          id?: string;
          item_id?: string;
          shot_order?: string;
          visual?: string;
          text_on_screen?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'item_shots_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };
      item_assets: {
        Row: {
          id: string;
          item_id: string;
          file_name: string;
          version_label: string;
          storage_path: string | null;
          mime_type: string | null;
          file_size: number | null;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          file_name: string;
          version_label: string;
          storage_path?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          file_name?: string;
          version_label?: string;
          storage_path?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_assets_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_assets_uploaded_by_fkey';
            columns: ['uploaded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      item_checklist: {
        Row: {
          id: string;
          item_id: string;
          label: string;
          done: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          item_id: string;
          label: string;
          done?: boolean;
          sort_order: number;
        };
        Update: {
          id?: string;
          item_id?: string;
          label?: string;
          done?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'item_checklist_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };
      item_comments: {
        Row: {
          id: string;
          item_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_comments_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_comments_author_id_fkey';
            columns: ['author_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          lead_date: string;
          source: string;
          name: string;
          contact: string;
          service: string;
          budget: string;
          status: string;
          follow_up: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_date: string;
          source: string;
          name: string;
          contact: string;
          service: string;
          budget: string;
          status: string;
          follow_up?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_date?: string;
          source?: string;
          name?: string;
          contact?: string;
          service?: string;
          budget?: string;
          status?: string;
          follow_up?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
